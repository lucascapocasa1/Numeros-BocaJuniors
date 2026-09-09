<?php

namespace Database\Seeders;

use App\Models\Balance;
use App\Models\BalanceLine;
use Illuminate\Database\Seeder;

/**
 * =============================================================================
 * PLANTILLA DE CARGA — Balances oficiales de Boca Juniors
 * =============================================================================
 *
 * OJO: a diferencia de EconomyRecordSeeder/ContractSeeder/RightSeeder, acá
 * NO hay un campo 'links'. La fuente de un balance es el propio documento:
 * subís el PDF real del balance (el que se presenta en la Asamblea de
 * Representantes) desde el panel admin, en /admin/balances → "Subir archivo".
 * Ese PDF queda guardado como file_path/file_original_name.
 *
 * Este seeder solo crea el "esqueleto" (ejercicio, dólar de referencia,
 * fecha de publicación y las líneas del balance con sus montos). Cargá acá
 * los números que saques del PDF oficial o de la cobertura de prensa del
 * día que Boca lo presenta, y después subí el PDF por separado desde el admin.
 *
 * CAMPOS DEL EJERCICIO:
 *   - 'exercise': ej. "2024/2025" (Boca numera sus ejercicios; podés agregar
 *     el número de ejercicio en el nombre si preferís, ej. "Ejercicio 121").
 *   - 'dollar_reference': tipo de cambio usado para convertir cifras en USD
 *     dentro del balance (opcional).
 *   - 'published_at': fecha en que se presentó/publicó el balance.
 *
 * CAMPOS DE CADA LÍNEA:
 *   - 'name': nombre del rubro (ACTIVO, PASIVO, Patrimonio Neto, etc).
 *   - 'amount': monto en 'currency' (dejalo en null en las filas que sean
 *     solo agrupadoras, ej. un total que se calcula de sus hijos).
 *   - 'is_total': true si es una fila de subtotal/total.
 *   - 'children': sub-rubros anidados (mismo formato, recursivo).
 * =============================================================================
 */
class BalanceSeeder extends Seeder
{
    public function run(): void
    {
        $balances = [
            // -----------------------------------------------------------------
            // REAL — Ejercicio N° 121 (jul-2024 a jun-2025), aprobado 29/10/2025.
            // Fuentes: comunicado oficial del club y cobertura periodística.
            //   https://www.bocajuniors.com.ar/noticias/superavit-record
            //   https://basedelfutbol.com.ar/clubes/boca-balance-superavit-plan-integral-obras/
            // Estos dos números (superávit y patrimonio neto) están verificados.
            // El resto del desglose (activo/pasivo detallado) NO está cargado:
            // conseguilo del PDF real y subilo en /admin/balances.
            // -----------------------------------------------------------------
            [
                'exercise'         => 'Ejercicio 121 (2024/2025)',
                'dollar_reference' => null, // TODO: si el PDF trae un dólar de referencia, cargalo
                'published_at'     => '2025-10-29',
                'lines'            => $this->lineasEjercicio121(),
            ],

            [
                'exercise'         => 'EJERCICIO A COMPLETAR (ej: 2023/2024)', // TODO
                'dollar_reference' => null, // TODO
                'published_at'     => null, // TODO: fecha real de publicación
                'lines'            => $this->lineasEjemplo(),
            ],

            // Agregá un bloque como este por cada ejercicio que quieras cargar,
            // con su propio método de líneas (ej: lineas2024_2025()).
        ];

        foreach ($balances as $balanceData) {
            $lines = $balanceData['lines'];
            unset($balanceData['lines']);

            $balance = Balance::create($balanceData);

            $this->createLines($balance, $lines);
        }
    }

    /**
     * Crea recursivamente las líneas del balance, resolviendo los parent_id.
     */
    private function createLines(Balance $balance, array $lines, ?int $parentId = null, int $level = 1, string $parentPath = ''): void
    {
        foreach ($lines as $order => $lineData) {
            $children = $lineData['children'] ?? [];
            unset($lineData['children']);

            $name           = $lineData['name'];
            $normalizedName = BalanceLine::normalizeName($name);
            $path           = $parentPath ? "{$parentPath}.{$normalizedName}" : $normalizedName;

            $line = BalanceLine::create([
                'balance_id'      => $balance->id,
                'parent_id'       => $parentId,
                'name'            => $name,
                'normalized_name' => $normalizedName,
                'level'           => $level,
                'order'           => $order + 1,
                'amount'          => $lineData['amount'] ?? null,
                'currency'        => $lineData['currency'] ?? 'ARS',
                'is_total'        => $lineData['is_total'] ?? false,
                'path'            => $path,
            ]);

            if (!empty($children)) {
                $this->createLines($balance, $children, $line->id, $level + 1, $path);
            }
        }
    }

    /**
     * Ejercicio 121 (2024/2025) — datos REALES y verificados (ver fuentes arriba
     * en run()). Solo tengo el patrimonio neto y el superávit del ejercicio;
     * el desglose de activo/pasivo hay que sacarlo del PDF oficial completo.
     */
    private function lineasEjercicio121(): array
    {
        return [
            [
                'name'     => 'PATRIMONIO NETO',
                'amount'   => 316_270_000_000,
                'currency' => 'ARS',
                'is_total' => true,
                'children' => [
                    [
                        'name'     => 'Superávit del ejercicio',
                        'amount'   => 35_581_000_000,
                        'currency' => 'ARS',
                    ],
                ],
            ],
            [
                'name'     => 'ACTIVO',
                'amount'   => null, // TODO: completar con el PDF oficial
                'currency' => 'ARS',
                'is_total' => true,
            ],
            [
                'name'     => 'PASIVO',
                'amount'   => null, // TODO: completar con el PDF oficial
                'currency' => 'ARS',
                'is_total' => true,
            ],
        ];
    }

    /**
     * Esqueleto de ejemplo — reemplazá los montos por los del PDF real.
     */
    private function lineasEjemplo(): array
    {
        return [
            [
                'name'     => 'ACTIVO',
                'amount'   => 0, // TODO
                'currency' => 'ARS',
                'is_total' => true,
                'children' => [
                    ['name' => 'Activo Corriente', 'amount' => 0, 'currency' => 'ARS'], // TODO
                    ['name' => 'Activo No Corriente', 'amount' => 0, 'currency' => 'ARS'], // TODO
                ],
            ],
            [
                'name'     => 'PASIVO',
                'amount'   => 0, // TODO
                'currency' => 'ARS',
                'is_total' => true,
                'children' => [
                    ['name' => 'Pasivo Corriente', 'amount' => 0, 'currency' => 'ARS'], // TODO
                    ['name' => 'Pasivo No Corriente', 'amount' => 0, 'currency' => 'ARS'], // TODO
                ],
            ],
            [
                'name'     => 'PATRIMONIO NETO',
                'amount'   => 0, // TODO
                'currency' => 'ARS',
                'is_total' => true,
            ],
        ];
    }
}
