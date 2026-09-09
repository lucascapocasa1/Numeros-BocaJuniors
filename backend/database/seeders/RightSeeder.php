<?php

namespace Database\Seeders;

use App\Models\Right;
use Illuminate\Database\Seeder;

/**
 * =============================================================================
 * PLANTILLA DE CARGA — Derechos económicos de Boca sobre jugadores
 * =============================================================================
 *
 * Esta tabla es para jugadores que YA NO están en el plantel (fueron
 * transferidos) pero sobre los que Boca retuvo un porcentaje del pase para
 * una futura venta. Es distinta de ContractSeeder (que es para el plantel
 * actual).
 *
 * FORMATO DE 'links' (idéntico a los otros seeders):
 *
 *   'links' => [
 *       ['url' => 'https://...', 'official' => false],
 *       ['url' => 'https://x.com/usuario/status/1234567890', 'official' => true],
 *   ],
 *
 * Esta info casi siempre sale a la luz recién cuando el jugador se vende
 * de nuevo (la nota de la venta suele mencionar qué % le queda a Boca), así
 * que buscá la cobertura periodística de la venta original como fuente.
 *
 * CAMPOS:
 *   - 'external_id': ID de Transfermarkt del jugador (opcional).
 *   - 'full_name': nombre del jugador.
 *   - 'clauses': array de strings libres — anotá acá el % retenido y
 *     cualquier condición (ej: "20% del futuro pase", "solo si se vende
 *     antes de 2027").
 * =============================================================================
 */
class RightSeeder extends Seeder
{
    public function run(): void
    {
        $rights = [

            // -----------------------------------------------------------------
            // EJEMPLO — completar con un caso real y su fuente
            // -----------------------------------------------------------------
            [
                'external_id' => null, // TODO: ID de Transfermarkt (opcional)
                'full_name'   => 'NOMBRE DEL JUGADOR (completar)',
                'clauses'     => [
                    // TODO: ej. '20% de un futuro pase a Club X'
                ],
                'links'       => [
                    // TODO: pegar acá la fuente que confirma el % retenido
                    // ['url' => 'https://...', 'official' => false],
                ],
            ],

            // Duplicá este bloque por cada jugador vendido con % retenido.
        ];

        foreach ($rights as $right) {
            Right::create($right);
        }
    }
}
