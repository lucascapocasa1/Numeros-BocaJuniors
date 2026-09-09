<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name'     => 'Admin',
            'email'    => 'admin@numerosazules.ar',
            'password' => Hash::make('password'),
        ]);

        $this->call([
            EconomyRecordSeeder::class,
            ContractSeeder::class,
            RightSeeder::class,
            BalanceSeeder::class,
            // StadiumSeeder::class, // Fuera de alcance por ahora (no pediste esta sección).
            // Si en algún momento querés la sección "Estadio", descomentá esta línea:
            // vas a tener que cargar vos los datos de la Bombonera en StadiumSeeder.php.
        ]);
    }
}
