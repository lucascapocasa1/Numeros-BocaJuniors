<?php

namespace App\Console\Commands;

use App\Services\XMonitorService;
use Illuminate\Console\Command;

class MonitorXAccountsCommand extends Command
{
    protected $signature   = 'twitter:monitor {--dry-run : Analiza y reporta sin ejecutar acciones ABM (sí avanza el checkpoint)}';
    protected $description = 'Revisa las cuentas de X configuradas e identifica novedades relevantes';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('Modo DRY RUN activado — no se modificará ningún dato.');
        }

        $this->info('Iniciando monitor de cuentas X...');

        try {
            $service = new XMonitorService();
            $report  = $service->run($dryRun);

            $this->info("Tweets encontrados:  {$report['tweets_found']}");
            $this->info("Tweets relevantes:   {$report['relevant_tweets']}");

            $label        = $dryRun ? 'Acciones que se tomarían' : 'Acciones realizadas';
            $actionsTaken = $report['actions_taken'] ?? [];
            $this->info("{$label}: " . count($actionsTaken));

            foreach ($actionsTaken as $action) {
                $status = $action['success'] ? '<info>OK</info>' : '<error>ERROR</error>';
                $this->line("  [{$status}] {$action['action']} — {$action['reason']}");
            }

            if (!empty($report['errors'])) {
                foreach ($report['errors'] as $error) {
                    $this->warn("  Advertencia: {$error}");
                }
            }

            $this->info('Monitor finalizado. Se ha enviado el reporte por email.');
            return 0;
        } catch (\Throwable $e) {
            $this->error('Error en el monitor: ' . $e->getMessage());
            return 1;
        }
    }
}
