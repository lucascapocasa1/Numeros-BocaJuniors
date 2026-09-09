<?php

namespace App\Services;

use App\Models\Contract;
use App\Models\EconomyRecord;
use App\Models\Right;
use App\Models\Rumor;
use App\Models\Setting;
use App\Models\TwitterAccount;
use Carbon\Carbon;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Mail;

class XMonitorService
{
    private Client $httpClient;
    private array  $log = [];
    private bool   $dryRun = false;

    public function __construct()
    {
        $this->httpClient = new Client(['timeout' => 120]);
    }

    /**
     * Main entry point.
     *
     * @param  bool  $dryRun  When true, skips all DB writes and does not advance last_checked_at.
     * @return array          Summary report including full execution log.
     */
    public function run(bool $dryRun = false): array
    {
        $this->dryRun = $dryRun;
        $this->log    = [];

        $this->logSection('INICIO DE EJECUCIÓN');
        $this->logLine('Fecha/hora : ' . Carbon::now()->format('d/m/Y H:i:s'));
        $this->logLine('Modo       : ' . ($dryRun ? 'DRY RUN (sin modificaciones)' : 'PRODUCCIÓN'));

        $twitterKey  = Setting::get('twitter_api_key');
        $openaiKey   = Setting::get('openai_api_key');
        $openaiModel = Setting::get('openai_model', 'gpt-4o');

        if (empty($twitterKey)) {
            throw new \RuntimeException('Twitter API Key no configurada');
        }
        if (empty($openaiKey)) {
            throw new \RuntimeException('OpenAI API Key no configurada');
        }

        $this->logLine("Modelo OpenAI: {$openaiModel}");

        $accounts = TwitterAccount::all();

        if ($accounts->isEmpty()) {
            $this->logLine('No hay cuentas de Twitter configuradas. Finalizando.');
            $report = ['tweets_found' => 0, 'relevant_tweets' => 0, 'actions_taken' => [], 'errors' => []];
            $this->sendEmail($report);
            return $report;
        }

        // ── FASE 1: Recolección de tweets ──────────────────────────────────
        $this->logSection('FASE 1 — RECOLECCIÓN DE TWEETS');

        $twitterService = new TwitterService($twitterKey);
        $allTweets      = [];
        $errors         = [];

        foreach ($accounts as $account) {
            $official = $account->is_official ? 'oficial' : 'no oficial';
            $since    = $account->last_checked_at;
            $sinceStr = $since ? $since->format('d/m/Y H:i:s') : 'sin límite (primera ejecución)';

            $this->logLine("Cuenta @{$account->username} ({$official}) — desde: {$sinceStr}");

            try {
                $tweets    = $twitterService->fetchTweetsSince($account, $since?->toDateTime());
                $allTweets = array_merge($allTweets, $tweets);

                $tweetCount = count($tweets);
                $this->logLine("  → {$tweetCount} tweet(s) obtenido(s)");

                if (!empty($tweets)) {
                    foreach ($tweets as $t) {
                        $this->logLine("    [{$t['created_at']}] {$t['text']}");
                    }
                }

                $account->last_checked_at = Carbon::now();
                $account->save();
                $this->logLine("  → last_checked_at actualizado");
            } catch (\Throwable $e) {
                $msg = "@{$account->username}: " . $e->getMessage();
                $this->logLine("  → ERROR: {$msg}");
                $errors[] = $msg;
            }
        }

        $this->logLine('');
        $this->logLine("Total tweets recolectados: " . count($allTweets));

        if (empty($allTweets)) {
            $this->logLine('Sin tweets nuevos. Finalizando.');
            $report = ['tweets_found' => 0, 'relevant_tweets' => 0, 'actions_taken' => [], 'errors' => $errors];
            $this->sendEmail($report);
            return $report;
        }

        // ── FASE 2: Análisis de relevancia (OpenAI call 1) ─────────────────
        $this->logSection('FASE 2 — ANÁLISIS DE RELEVANCIA (OpenAI call 1)');

        $relevanceResult = $this->analyzeRelevance($openaiKey, $openaiModel, $allTweets);

        $relevantCount = count($relevanceResult['relevant_tweets'] ?? []);
        $this->logLine("Tweets relevantes detectados: {$relevantCount}");

        if (empty($relevanceResult['relevant_tweets'])) {
            $this->logLine('Ningún tweet resultó relevante. Finalizando.');
            $report = [
                'tweets_found'    => count($allTweets),
                'relevant_tweets' => 0,
                'actions_taken'   => [],
                'errors'          => $errors,
            ];
            $this->sendEmail($report);
            return $report;
        }

        // ── FASE 3: Búsquedas en la base de datos ─────────────────────────
        $this->logSection('FASE 3 — BÚSQUEDAS EN BASE DE DATOS');

        $searchResults = $this->runSearches($relevanceResult['search_queries'] ?? []);

        // ── FASE 4: Determinación de acciones (OpenAI call 2) ─────────────
        $this->logSection('FASE 4 — DETERMINACIÓN DE ACCIONES (OpenAI call 2)');

        $actions = $this->determineActions(
            $openaiKey,
            $openaiModel,
            $relevanceResult['relevant_tweets'],
            $searchResults
        );

        // ── FASE 5: Ejecución de acciones ─────────────────────────────────
        $this->logSection('FASE 5 — EJECUCIÓN DE ACCIONES');

        if ($dryRun) {
            $this->logLine('[DRY RUN] Las siguientes acciones NO serán ejecutadas:');
            $executedActions = $this->simulateActions($actions);
        } else {
            $executedActions = $this->executeActions($actions);
        }

        foreach ($executedActions as $a) {
            $tag = $a['success'] ? 'OK   ' : 'ERROR';
            $this->logLine("[{$tag}] {$a['action']} — {$a['reason']}");
            if (!$a['success']) {
                $this->logLine("       Detalle: {$a['result']}");
            }
        }

        $report = [
            'tweets_found'    => count($allTweets),
            'relevant_tweets' => $relevantCount,
            'actions_taken'   => $executedActions,
            'errors'          => $errors,
        ];

        $this->sendEmail($report);

        return $report;
    }

    // ── OpenAI: relevancia ─────────────────────────────────────────────────

    private function analyzeRelevance(string $apiKey, string $model, array $tweets): array
    {
        $tweetsText = '';
        foreach ($tweets as $i => $tweet) {
            $official    = $tweet['is_official'] ? '[OFICIAL]' : '[No oficial]';
            $tweetsText .= sprintf(
                "%d. @%s %s (%s):\n%s\n\n",
                $i + 1,
                $tweet['username'],
                $official,
                $tweet['created_at'],
                $tweet['text']
            );
        }

        $systemPrompt = <<<PROMPT
Sos un asistente especializado en el seguimiento de actividad institucional de clubes de fútbol argentinos.

El sistema gestiona los siguientes tipos de registros:
- Contratos de jugadores profesionales (contratación, renovación, cláusulas, etc)
- Registros económicos (compromisos de pago, transferencias, ingresos, egresos, cláusulas, etc)
- Derechos económicos de ex jugadores del club
- Rumores de mercado (jugadores vinculados o sondeados como posibles incorporaciones)

Tu tarea es analizar una lista de tweets recientes y determinar cuáles son relevantes para alguno de estos dominios.

REGLAS FUNDAMENTALES que debés respetar estrictamente:

1. CONFIRMADOS vs. RUMORES: Para contratos, economía y derechos, ignorá tweets sobre rumores o hechos no confirmados: solo hechos ya realizados. Para el dominio "rumor", SÍ son relevantes los tweets de cuentas [No oficial] que mencionen jugadores como posibles incorporaciones, refuerzos sondeados o fichajes en negociación. Los tweets de cuentas [OFICIAL] NUNCA generan rumores.

2. FUENTE OFICIAL PARA CONTRATOS: Para que un tweet sea relevante respecto a la CREACIÓN o RESCISIÓN de un contrato, es imprescindible que provenga de una cuenta marcada como [OFICIAL]. Los tweets de cuentas [No oficial] solo pueden ser relevantes para agregar información complementaria (cláusulas, detalles, etc.) a un contrato ya existente, nunca para crear o rescindir uno.

3. Las cuentas [No oficial] SÍ pueden ser fuente válida para registros económicos, derechos y rumores.

Para cada tweet relevante, indicá también qué términos de búsqueda conviene usar en nuestra base de datos para ver si ya tenemos información relacionada.

Respondé ÚNICAMENTE con JSON válido, sin texto adicional.
PROMPT;

        $userPrompt = <<<PROMPT
Analizá los siguientes tweets y respondé con el JSON especificado:

{$tweetsText}
Respondé con este formato:
{
  "relevant_tweets": [
    {
      "index": 1,
      "username": "@usuario",
      "text": "texto del tweet",
      "reason": "por qué es relevante",
      "domain": "contract|economy_record|right|rumor|multiple"
    }
  ],
  "search_queries": [
    {
      "type": "contract|economy_record|right",
      "search": "nombre o término a buscar"
    }
  ]
}

Si ningún tweet es relevante, devolvé: {"relevant_tweets": [], "search_queries": []}
PROMPT;

        $this->logLine('─ System prompt:');
        $this->logBlock($systemPrompt);
        $this->logLine('─ User prompt:');
        $this->logBlock($userPrompt);

        $result = $this->callOpenAi($apiKey, $model, $systemPrompt, $userPrompt, 'relevancia');

        $this->logLine('─ Tweets relevantes identificados:');
        foreach ($result['relevant_tweets'] ?? [] as $rt) {
            $this->logLine("  • @{$rt['username']}: {$rt['reason']} [{$rt['domain']}]");
        }

        $this->logLine('─ Queries de búsqueda sugeridas:');
        foreach ($result['search_queries'] ?? [] as $sq) {
            $this->logLine("  • [{$sq['type']}] \"{$sq['search']}\"");
        }

        return $result;
    }

    // ── Búsquedas en DB ────────────────────────────────────────────────────

    private function runSearches(array $queries): array
    {
        $results = [];

        foreach ($queries as $query) {
            $type   = $query['type'] ?? '';
            $search = $query['search'] ?? '';

            if (empty($search)) {
                continue;
            }

            $this->logLine("Buscando [{$type}] \"{$search}\"...");

            switch ($type) {
                case 'contract':
                    $rows = Contract::search($search)->limit(5)
                        ->get(['id', 'full_name', 'expiration_date', 'currency', 'estimated_salary'])
                        ->toArray();
                    break;

                case 'economy_record':
                    $rows = EconomyRecord::search($search)->limit(5)
                        ->get(['id', 'description', 'entity', 'type', 'amount', 'currency', 'record_date'])
                        ->toArray();
                    break;

                case 'right':
                    $rows = Right::search($search)->limit(5)
                        ->get(['id', 'full_name'])
                        ->toArray();
                    break;

                case 'rumor':
                    $rows = Rumor::search($search)->limit(5)
                        ->get(['id', 'full_name', 'status', 'external_id'])
                        ->toArray();
                    break;

                default:
                    $rows = [];
            }

            $found = count($rows);
            $this->logLine("  → {$found} resultado(s)");

            foreach ($rows as $row) {
                $this->logLine('    ' . json_encode($row, JSON_UNESCAPED_UNICODE));
            }

            $results[] = ['query' => $query, 'results' => $rows];
        }

        return $results;
    }

    // ── OpenAI: acciones ───────────────────────────────────────────────────

    private function determineActions(string $apiKey, string $model, array $relevantTweets, array $searchResults): array
    {
        $tweetsText = '';
        foreach ($relevantTweets as $tweet) {
            $tweetsText .= sprintf("- @%s: %s\n  Dominio: %s | Razón: %s\n\n",
                $tweet['username'], $tweet['text'], $tweet['domain'], $tweet['reason']);
        }

        $searchText = '';
        foreach ($searchResults as $sr) {
            $queryDesc   = sprintf("[%s] \"%s\"", $sr['query']['type'], $sr['query']['search']);
            $searchText .= "\nBúsqueda {$queryDesc}:\n";

            if (empty($sr['results'])) {
                $searchText .= "  Sin resultados existentes.\n";
            } else {
                foreach ($sr['results'] as $row) {
                    $searchText .= '  - ' . json_encode($row, JSON_UNESCAPED_UNICODE) . "\n";
                }
            }
        }

        $systemPrompt = <<<PROMPT
Sos un asistente especializado en gestión de información de clubes de fútbol argentinos.

El sistema maneja:
- Contratos: full_name, expiration_date, signing_date, termination_date, estimated_salary, currency (ARS/USD/EUR), clauses (array), links (array de {url, label, official}), loan (objeto o null), external_id (número de BeSoccer)
- Registros económicos (EconomyRecord): description, entity, type (ingreso|egreso|transferencia|pase|otro), amount, currency, record_date, carried_out_date (fecha de confirmación, null si no confirmado), links
- Derechos (Right): full_name, clauses, links, external_id (número de BeSoccer)
- Rumores de mercado (Rumor): full_name, external_id (BeSoccer — OBLIGATORIO), status (rumor|contratado), links

Tu tarea: dados los tweets relevantes y los resultados de búsqueda, determiná qué acciones concretas se deben tomar.

Acciones posibles:
- create_contract / update_contract / add_source_to_contract
- create_economy_record / update_economy_record / add_source_to_economy_record
- create_right / update_right / add_source_to_right
- create_rumor / update_rumor / add_source_to_rumor
- no_action

REGLAS FUNDAMENTALES que debés respetar estrictamente:

1. SOLO HECHOS CONFIRMADOS (excepto rumores): Nunca tomes acciones basadas en especulaciones para contratos, economía o derechos. Solo actuás sobre hechos ya realizados. Para rumores, las versiones no confirmadas SÍ son accionables.

2. FUENTE OFICIAL OBLIGATORIA PARA CONTRATOS: Para create_contract o para registrar la rescisión/terminación de un contrato (update_contract con termination_date), la fuente DEBE ser una cuenta [OFICIAL]. Las cuentas [No oficial] solo pueden generar acciones de tipo add_source_to_contract o update_contract para agregar información complementaria (cláusulas, detalles, etc.), nunca para crear o rescindir contratos.

3. FECHAS DE VENCIMIENTO DE CONTRATOS: La fecha de finalización de un contrato en el fútbol argentino siempre cae el 31/12 o el 30/06 de algún año. Aplicá estas reglas de conversión:
   - "firma hasta 2028" → expiration_date = "2027-12-31" (el año mencionado indica el año del torneo siguiente, el contrato vence el 31/12 del año anterior)
   - "contrato hasta diciembre de 2027" → expiration_date = "2027-12-31"
   - "contrato hasta junio de 2027" → expiration_date = "2027-06-30"
   - "firma por N años" → calculá desde la fecha actual y usá el 31/12 del año N desde ahora (o 30/06 si se menciona mitad de año)
   - Ante la duda entre 31/12 y 30/06, usá 31/12.

4. EXTERNAL_ID DE BESOCCER: Si necesitás crear un contrato, un derecho o un rumor y no conocés el external_id del jugador, podés obtenerlo buscando en https://www.besoccer.com/search/{nombre-del-jugador}. En esa página aparece una lista de jugadores; la URL de cada perfil contiene el ID numérico al final (por ejemplo: https://www.besoccer.com/player/nombre-jugador-123456 → external_id = 123456). Incluí el external_id en los datos si podés determinarlo con confianza; si no, dejalo en null.

5. RUMORES — REGLAS ESPECÍFICAS:
   - create_rumor y add_source_to_rumor SOLO pueden originarse en cuentas [No oficial]. Los tweets [OFICIAL] nunca crean rumores.
   - El external_id de BeSoccer es OBLIGATORIO para create_rumor. Si no podés determinarlo con confianza, usá no_action en lugar de crear el rumor sin ID.
   - Si un jugador ya está en la base como rumor y se confirma su fichaje, podés usar update_rumor con status="contratado"; esta acción SÍ puede provenir de cuentas [OFICIAL].

Para add_source_*: el objeto data debe tener {url: null, label: "...", official: true/false}.
Marcá official: true solo si el tweet proviene de una fuente marcada como [OFICIAL].

Respondé ÚNICAMENTE con JSON válido, sin texto adicional.
PROMPT;

        $userPrompt = <<<PROMPT
Tweets relevantes:
{$tweetsText}
Resultados de búsqueda en base de datos:
{$searchText}

Respondé con el siguiente JSON:
{
  "analysis": "descripción detallada de lo detectado y el razonamiento detrás de las acciones",
  "actions": [
    {
      "action": "...",
      "reason": "justificación concreta",
      "id": null,
      "data": {}
    }
  ]
}
PROMPT;

        $this->logLine('─ System prompt:');
        $this->logBlock($systemPrompt);
        $this->logLine('─ User prompt:');
        $this->logBlock($userPrompt);

        $result = $this->callOpenAi($apiKey, $model, $systemPrompt, $userPrompt, 'acciones');

        $this->logLine('─ Análisis de OpenAI:');
        $this->logBlock($result['analysis'] ?? '(sin análisis)');

        $this->logLine('─ Acciones propuestas:');
        foreach ($result['actions'] ?? [] as $i => $a) {
            $idStr = $a['id'] ? " (id={$a['id']})" : '';
            $this->logLine("  " . ($i + 1) . ". {$a['action']}{$idStr} — {$a['reason']}");
            if (!empty($a['data'])) {
                $this->logLine('     data: ' . json_encode($a['data'], JSON_UNESCAPED_UNICODE));
            }
        }

        return $result['actions'] ?? [];
    }

    // ── Ejecución / simulación de acciones ────────────────────────────────

    private function executeActions(array $actions): array
    {
        $executed = [];

        foreach ($actions as $action) {
            $type   = $action['action'] ?? 'no_action';
            $data   = $action['data']   ?? [];
            $id     = $action['id']     ?? null;
            $reason = $action['reason'] ?? '';

            try {
                $result = match ($type) {
                    'create_contract'              => $this->createContract($data),
                    'update_contract'              => $this->updateContract((int) $id, $data),
                    'add_source_to_contract'       => $this->addSourceTo(Contract::class, (int) $id, $data),
                    'create_economy_record'        => $this->createEconomyRecord($data),
                    'update_economy_record'        => $this->updateEconomyRecord((int) $id, $data),
                    'add_source_to_economy_record' => $this->addSourceTo(EconomyRecord::class, (int) $id, $data),
                    'create_right'                 => $this->createRight($data),
                    'update_right'                 => $this->updateRight((int) $id, $data),
                    'add_source_to_right'          => $this->addSourceTo(Right::class, (int) $id, $data),
                    'create_rumor'                 => $this->createRumor($data),
                    'update_rumor'                 => $this->updateRumor((int) $id, $data),
                    'add_source_to_rumor'          => $this->addSourceTo(Rumor::class, (int) $id, $data),
                    'no_action'                    => ['status' => 'skipped'],
                    default                        => ['status' => 'unknown_action'],
                };

                $executed[] = ['action' => $type, 'reason' => $reason, 'result' => $result, 'success' => true];
            } catch (\Throwable $e) {
                $executed[] = ['action' => $type, 'reason' => $reason, 'result' => $e->getMessage(), 'success' => false];
            }
        }

        return $executed;
    }

    private function simulateActions(array $actions): array
    {
        return array_map(fn($a) => [
            'action'  => $a['action'] ?? 'no_action',
            'reason'  => $a['reason'] ?? '',
            'result'  => ['status' => 'dry_run_skipped', 'data' => $a['data'] ?? []],
            'success' => true,
        ], $actions);
    }

    // ── Helpers de ABM ─────────────────────────────────────────────────────

    private function createContract(array $data): array
    {
        $allowed  = ['full_name', 'expiration_date', 'signing_date', 'termination_date',
                     'estimated_salary', 'currency', 'clauses', 'links', 'loan', 'external_id'];
        $contract = Contract::create(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'created', 'id' => $contract->id];
    }

    private function updateContract(int $id, array $data): array
    {
        $contract = Contract::findOrFail($id);
        $allowed  = ['full_name', 'expiration_date', 'signing_date', 'termination_date',
                     'estimated_salary', 'currency', 'clauses', 'links', 'loan'];
        $contract->update(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'updated', 'id' => $id];
    }

    private function createEconomyRecord(array $data): array
    {
        $allowed = ['description', 'comments', 'entity', 'type', 'amount', 'currency',
                    'record_date', 'carried_out_date', 'links'];
        $record  = EconomyRecord::create(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'created', 'id' => $record->id];
    }

    private function updateEconomyRecord(int $id, array $data): array
    {
        $record  = EconomyRecord::findOrFail($id);
        $allowed = ['description', 'comments', 'entity', 'type', 'amount', 'currency',
                    'record_date', 'carried_out_date', 'links'];
        $record->update(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'updated', 'id' => $id];
    }

    private function createRight(array $data): array
    {
        $allowed = ['full_name', 'clauses', 'links', 'external_id'];
        $right   = Right::create(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'created', 'id' => $right->id];
    }

    private function updateRight(int $id, array $data): array
    {
        $right   = Right::findOrFail($id);
        $allowed = ['full_name', 'clauses', 'links'];
        $right->update(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'updated', 'id' => $id];
    }

    private function createRumor(array $data): array
    {
        if (empty($data['external_id'])) {
            throw new \RuntimeException('create_rumor requiere external_id (BeSoccer ID)');
        }
        $allowed = ['full_name', 'external_id', 'status', 'links'];
        $rumor   = Rumor::create(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'created', 'id' => $rumor->id];
    }

    private function updateRumor(int $id, array $data): array
    {
        $rumor   = Rumor::findOrFail($id);
        $allowed = ['full_name', 'status', 'links'];
        $rumor->update(array_intersect_key($data, array_flip($allowed)));
        return ['status' => 'updated', 'id' => $id];
    }

    private function addSourceTo(string $modelClass, int $id, array $sourceData): array
    {
        $model   = $modelClass::findOrFail($id);
        $links   = $model->links ?? [];
        $links[] = [
            'url'      => $sourceData['url'] ?? null,
            'label'    => $sourceData['label'] ?? 'Fuente',
            'official' => (bool) ($sourceData['official'] ?? false),
        ];
        $model->links = $links;
        $model->save();
        return ['status' => 'source_added', 'id' => $id];
    }

    // ── OpenAI helper ─────────────────────────────────────────────────────

    private function callOpenAi(string $apiKey, string $model, string $systemPrompt, string $userPrompt, string $label): array
    {
        try {
            $response = $this->httpClient->post('https://api.openai.com/v1/chat/completions', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'model'           => $model,
                    'messages'        => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user',   'content' => $userPrompt],
                    ],
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens'      => 4096,
                ],
            ]);

            $raw     = $response->getBody()->getContents();
            $data    = json_decode($raw, true);
            $content = $data['choices'][0]['message']['content'] ?? '{}';

            $this->logLine("─ Respuesta raw de OpenAI ({$label}):");
            $this->logBlock($content);

            return json_decode($content, true) ?? [];
        } catch (GuzzleException $e) {
            throw new \RuntimeException('Error al llamar a OpenAI: ' . $e->getMessage());
        }
    }

    // ── Logging interno ───────────────────────────────────────────────────

    private function logSection(string $title): void
    {
        $this->log[] = '';
        $this->log[] = str_repeat('=', 60);
        $this->log[] = "  {$title}";
        $this->log[] = str_repeat('=', 60);
    }

    private function logLine(string $line): void
    {
        $this->log[] = $line;
    }

    private function logBlock(string $text): void
    {
        foreach (explode("\n", $text) as $line) {
            $this->log[] = '  ' . $line;
        }
    }

    // ── Email ─────────────────────────────────────────────────────────────

    private function sendEmail(array $report): void
    {
        $adminEmail = env('ADMIN_EMAIL');
        if (!$adminEmail) {
            return;
        }

        $dryTag  = $this->dryRun ? ' [DRY RUN]' : '';
        $subject = "Números Azules – Monitor X{$dryTag}: reporte de actividad";

        $body = $this->buildEmailBody($report);

        Mail::raw($body, function ($message) use ($adminEmail, $subject) {
            $message->to($adminEmail)->subject($subject);
        });
    }

    private function buildEmailBody(array $report): string
    {
        $dryTag  = $this->dryRun ? ' [DRY RUN — sin modificaciones]' : '';
        $lines   = [];

        $lines[] = "MONITOR X – REPORTE DE ACTIVIDAD{$dryTag}";
        $lines[] = str_repeat('─', 60);
        $lines[] = '';
        $lines[] = "Tweets encontrados : {$report['tweets_found']}";
        $lines[] = "Tweets relevantes  : {$report['relevant_tweets']}";
        $lines[] = "Acciones           : " . count($report['actions_taken'] ?? []);

        if (!empty($report['errors'])) {
            $lines[] = '';
            $lines[] = 'ERRORES:';
            foreach ($report['errors'] as $err) {
                $lines[] = "  - {$err}";
            }
        }

        $lines[] = '';
        $lines[] = str_repeat('─', 60);
        $lines[] = 'ACCIONES TOMADAS:';
        $lines[] = str_repeat('─', 60);

        if (empty($report['actions_taken'])) {
            $lines[] = '  (ninguna)';
        } else {
            foreach ($report['actions_taken'] as $a) {
                $tag     = $a['success'] ? 'OK   ' : 'ERROR';
                $lines[] = "[{$tag}] {$a['action']} — {$a['reason']}";
                $lines[] = "       resultado: " . (is_array($a['result'])
                    ? json_encode($a['result'], JSON_UNESCAPED_UNICODE)
                    : $a['result']);
                $lines[] = '';
            }
        }

        $lines[] = str_repeat('─', 60);
        $lines[] = 'LOG DETALLADO DE EJECUCIÓN:';
        $lines[] = str_repeat('─', 60);
        foreach ($this->log as $logLine) {
            $lines[] = $logLine;
        }

        return implode("\n", $lines);
    }
}
