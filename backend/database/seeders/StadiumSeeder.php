<?php

namespace Database\Seeders;

use App\Models\StadiumConfig;
use App\Models\StadiumSector;
use Illuminate\Database\Seeder;

class StadiumSeeder extends Seeder
{
    public function run(): void
    {
        $stadium = StadiumConfig::create([
            'name'          => 'Estadio Julio Humberto Grondona',
            'link'          => null,
            'link_official' => false,
        ]);

        $sectors = [
            ['name' => 'Popular',           'capacity' => 15000, 'order' => 1],
            ['name' => 'Platea Baja',        'capacity' => 8000,  'order' => 2],
            ['name' => 'Platea Alta',        'capacity' => 6000,  'order' => 3],
            ['name' => 'Palcos',             'capacity' => 500,   'order' => 4],
            ['name' => 'Popular Visitantes', 'capacity' => 2000,  'order' => 5],
        ];

        foreach ($sectors as $sector) {
            StadiumSector::create(array_merge(
                ['stadium_config_id' => $stadium->id],
                $sector
            ));
        }
    }
}
