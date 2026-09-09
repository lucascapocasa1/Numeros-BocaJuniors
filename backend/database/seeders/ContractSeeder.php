<?php

namespace Database\Seeders;

use App\Models\Contract;
use Illuminate\Database\Seeder;

/**
 * =============================================================================
 * PLANTILLA DE CARGA — Contratos de jugadores de Boca Juniors
 * =============================================================================
 *
 * Boca no publica contratos oficiales, así que estos datos van a salir de
 * fuentes periodísticas/de mercado (ej. Transfermarkt) o de trascendidos
 * confirmados por el propio club. Por eso 'links' es obligatorio: cada fila
 * tiene que decir de dónde salió el sueldo estimado, el % de pase, etc.
 *
 * FORMATO DE 'links' (igual que en EconomyRecordSeeder):
 *
 *   'links' => [
 *       ['url' => 'https://www.transfermarkt.com/.../profil/spieler/...', 'official' => false],
 *       ['url' => 'https://x.com/BocaJrsOficial/status/1234567890', 'official' => true],
 *   ],
 *
 *   - 'official' => true SOLO si la fuente es el propio club. Casi todo lo
 *     referido a sueldos y % de pase va a ser 'official' => false (estimado
 *     por prensa/mercado) — no fuerces el badge de oficial si no corresponde.
 *
 * CAMPOS:
 *   - 'external_id': ID del jugador en Transfermarkt si lo usás como fuente de
 *     estadísticas (opcional, dejalo en null si no aplica).
 *   - 'expiration_date': vencimiento de contrato (YYYY-MM-DD).
 *   - 'club_pass_percentage': % del pase que retiene Boca (0 a 100).
 *   - 'estimated_salary' / 'currency': sueldo estimado y moneda (nullable si
 *     no hay dato confiable — mejor dejarlo vacío que inventarlo).
 *   - 'clauses': array de strings libres (cláusula de rescisión, opción de
 *     compra, etc).
 *   - Para préstamos, rescisiones o fecha de firma: cargalos directamente
 *     desde el panel admin (/admin/contratos), ahí están todos los campos
 *     del formulario con su explicación.
 * =============================================================================
 */
class ContractSeeder extends Seeder
{
    public function run(): void
    {
        $contracts = [

            // -----------------------------------------------------------------
            // EJEMPLO — completar con un jugador real y su fuente
            // -----------------------------------------------------------------
            [
                'external_id'          => null, // TODO: ID de Transfermarkt (opcional)
                'full_name'            => 'NOMBRE DEL JUGADOR (completar)',
                'expiration_date'      => '2027-12-31', // TODO: fecha real
                'club_pass_percentage' => 100.00,        // TODO: % real
                'estimated_salary'     => null,          // TODO: si tenés fuente confiable
                'currency'             => null,
                'clauses'              => [],
                'links'                => [
                    // TODO: pegar acá la fuente (Transfermarkt, nota de prensa o X)
                    // ['url' => 'https://...', 'official' => false],
                ],
            ],

            // Duplicá este bloque por cada jugador del plantel que quieras cargar.
        ];

        foreach ($contracts as $contract) {
            Contract::create($contract);
        }
    }
}
