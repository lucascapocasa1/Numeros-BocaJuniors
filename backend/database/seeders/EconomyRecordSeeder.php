<?php

namespace Database\Seeders;

use App\Models\EconomyRecord;
use Illuminate\Database\Seeder;

/**
 * =============================================================================
 * PLANTILLA DE CARGA — Registros económicos de Boca Juniors
 * =============================================================================
 *
 * Este seeder viene con filas de EJEMPLO, no con datos reales. Reemplazá cada
 * registro por información que vos mismo verificaste, y completá SIEMPRE el
 * campo 'links' con la fuente que respalda ese dato.
 *
 * FORMATO DE 'links' (no lo cambies, el frontend depende de esta forma):
 *
 *   'links' => [
 *       ['url' => 'https://ejemplo.com/nota-o-comunicado', 'official' => false],
 *       ['url' => 'https://x.com/BocaJrsOficial/status/1234567890', 'official' => true],
 *   ],
 *
 *   - 'url': el link completo a la fuente. Puede ser:
 *       · Una página web (comunicado del club, nota de un medio, balance publicado).
 *       · Un posteo de X/Twitter (pegá la URL del tuit tal cual, ej:
 *         https://x.com/usuario/status/1234567890123456789).
 *   - 'official': poné 'true' SOLO si la fuente es el propio club (su web,
 *     su cuenta oficial de X, un comunicado firmado). Si es una fuente
 *     periodística o extraoficial, dejalo en 'false'.
 *   - Podés poner más de un link por registro (ej: la noticia + el tuit que
 *     la confirma). El primero marcado 'official' => true es el que el sitio
 *     va a priorizar para mostrar la insignia de "oficial".
 *
 * OTROS CAMPOS:
 *   - 'type': 'cobro' (ingreso) o 'pago' (egreso).
 *   - 'amount' / 'currency': monto y moneda (ARS, USD o EUR).
 *   - 'record_date': fecha del hecho económico (nullable si no se sabe con precisión).
 *   - 'carried_out_date': fecha en la que efectivamente se concretó el cobro/pago
 *     (dejalo en null si todavía es un compromiso pendiente, no un hecho).
 *   - 'entity': la contraparte (club comprador, sponsor, organismo, etc).
 *   - 'comments': contexto libre, aclaraciones.
 *
 * Cada bloque de abajo representa una CATEGORÍA típica de este tipo de portal
 * para Boca. Duplicá el bloque que necesites y completalo con datos reales.
 * =============================================================================
 */
class EconomyRecordSeeder extends Seeder
{
    public function run(): void
    {
        $records = [

            // -----------------------------------------------------------------
            // REAL — Patrocinio con Hard Rock Café, confirmado en la Asamblea
            // de Representantes del 29/10/2025. El monto del acuerdo no fue
            // difundido públicamente; si lo conseguís, actualizalo.
            // Fuente: https://basedelfutbol.com.ar/clubes/boca-balance-superavit-plan-integral-obras/
            // -----------------------------------------------------------------
            [
                'description'       => 'Patrocinio con Hard Rock Café',
                'type'              => 'cobro',
                'amount'            => 0.00, // TODO: monto no difundido públicamente
                'currency'          => 'USD',
                'record_date'       => '2025-10-29',
                'carried_out_date'  => null,
                'entity'            => 'Hard Rock Café',
                'comments'          => 'Acuerdo confirmado en la misma Asamblea donde se aprobó el balance del Ejercicio 121. Monto no informado públicamente al momento de la carga.',
                'links'             => [
                    ['url' => 'https://basedelfutbol.com.ar/clubes/boca-balance-superavit-plan-integral-obras/', 'official' => false],
                ],
            ],

            // -----------------------------------------------------------------
            // EJEMPLO 1 — Derechos de TV / Liga Profesional
            // -----------------------------------------------------------------
            [
                'description'       => '[EJEMPLO] Derechos de TV - Cuota LPF (completar período)',
                'type'              => 'cobro',
                'amount'            => 0.00, // TODO: reemplazar por el monto real (no puede quedar en 0)
                'currency'          => 'ARS',
                'record_date'       => null, // TODO: fecha real (YYYY-MM-DD)
                'carried_out_date'  => null, // TODO: si ya se cobró, poné la fecha; si no, dejalo en null
                'entity'            => 'Liga Profesional de Fútbol',
                'comments'          => 'Reemplazar por el dato real y su fuente.',
                'links'             => [
                    // TODO: pegar acá la fuente (web u X) que confirma este dato
                    // ['url' => 'https://...', 'official' => false],
                ],
            ],

            // -----------------------------------------------------------------
            // EJEMPLO 2 — Sponsor / patrocinio
            // -----------------------------------------------------------------
            [
                'description'       => '[EJEMPLO] Patrocinio principal de camiseta (completar sponsor)',
                'type'              => 'cobro',
                'amount'            => 0.00, // TODO: reemplazar por el monto real (no puede quedar en 0)
                'currency'          => 'USD',
                'record_date'       => null,
                'carried_out_date'  => null,
                'entity'            => 'Nombre del sponsor',
                'comments'          => 'Reemplazar por el dato real y su fuente.',
                'links'             => [
                    // ['url' => 'https://x.com/BocaJrsOficial/status/...', 'official' => true],
                ],
            ],

            // -----------------------------------------------------------------
            // EJEMPLO 3 — Venta de un jugador (ingreso por transferencia)
            // -----------------------------------------------------------------
            [
                'description'       => '[EJEMPLO] Venta de Jugador X al Club Y - cuota o pago único',
                'type'              => 'cobro',
                'amount'            => 0.00, // TODO: reemplazar por el monto real (no puede quedar en 0)
                'currency'          => 'USD',
                'record_date'       => null,
                'carried_out_date'  => null,
                'entity'            => 'Club comprador',
                'comments'          => 'Si es en cuotas, cargar un registro por cada cuota.',
                'links'             => [
                    // ['url' => 'https://...', 'official' => false],
                ],
            ],

            // -----------------------------------------------------------------
            // EJEMPLO 4 — Compra de un jugador (egreso por transferencia)
            // -----------------------------------------------------------------
            [
                'description'       => '[EJEMPLO] Compra de Jugador X al Club Y',
                'type'              => 'pago',
                'amount'            => 0.00, // TODO: reemplazar por el monto real (no puede quedar en 0)
                'currency'          => 'USD',
                'record_date'       => null,
                'carried_out_date'  => null,
                'entity'            => 'Club vendedor',
                'comments'          => '',
                'links'             => [],
            ],

            // -----------------------------------------------------------------
            // EJEMPLO 5 — Masa salarial (egreso recurrente)
            // -----------------------------------------------------------------
            [
                'description'       => '[EJEMPLO] Pago de salarios - Plantel profesional (mes/año)',
                'type'              => 'pago',
                'amount'            => 0.00, // TODO: reemplazar por el monto real (no puede quedar en 0)
                'currency'          => 'ARS',
                'record_date'       => null,
                'carried_out_date'  => null,
                'entity'            => 'Plantel profesional',
                'comments'          => '',
                'links'             => [],
            ],

            // -----------------------------------------------------------------
            // EJEMPLO 6 — Deuda declarada / compromiso pendiente
            // -----------------------------------------------------------------
            [
                'description'       => '[EJEMPLO] Deuda declarada con (completar acreedor)',
                'type'              => 'pago',
                'amount'            => 0.00, // TODO: reemplazar por el monto real (no puede quedar en 0)
                'currency'          => 'ARS',
                'record_date'       => null,
                'carried_out_date'  => null, // pendiente => se deja en null
                'entity'            => 'Acreedor',
                'comments'          => 'Compromiso todavía no efectivizado.',
                'links'             => [],
            ],
        ];

        foreach ($records as $record) {
            EconomyRecord::create($record);
        }
    }
}
