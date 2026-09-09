<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Balance;
use App\Models\Contract;
use App\Models\EconomyRecord;
use App\Models\ElectionList;
use App\Models\Setting;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $baseUrl = rtrim(env('FRONTEND_URL', 'https://www.numerosbocajuniors.net'), '/');

        $contracts     = Contract::select('id', 'updated_at')->orderBy('id')->get();
        $economyRecords = EconomyRecord::select('id', 'updated_at')->orderBy('id')->get();
        $balances      = Balance::select('id', 'updated_at')->orderBy('id')->get();

        $urls = [];

        // Páginas estáticas
        $urls[] = ['loc' => $baseUrl . '/',             'priority' => '1.0', 'changefreq' => 'weekly'];
        $urls[] = ['loc' => $baseUrl . '/contratos',    'priority' => '0.9', 'changefreq' => 'daily'];
        $urls[] = ['loc' => $baseUrl . '/economia',     'priority' => '0.9', 'changefreq' => 'daily'];
        $urls[] = ['loc' => $baseUrl . '/balances',     'priority' => '0.7', 'changefreq' => 'monthly'];
        $urls[] = ['loc' => $baseUrl . '/estadisticas', 'priority' => '0.6', 'changefreq' => 'weekly'];
        $urls[] = ['loc' => $baseUrl . '/derechos',     'priority' => '0.6', 'changefreq' => 'monthly'];
        $urls[] = ['loc' => $baseUrl . '/estadio',      'priority' => '0.5', 'changefreq' => 'monthly'];

        if (Setting::get('section_elecciones_enabled', '0') === '1') {
            $urls[] = ['loc' => $baseUrl . '/elecciones', 'priority' => '0.7', 'changefreq' => 'weekly'];

            $electionLists = ElectionList::select('slug', 'updated_at')->whereNotNull('slug')->orderBy('id')->get();
            foreach ($electionLists as $list) {
                $urls[] = [
                    'loc'        => $baseUrl . '/elecciones/' . $list->slug,
                    'lastmod'    => $list->updated_at->toAtomString(),
                    'priority'   => '0.6',
                    'changefreq' => 'weekly',
                ];
            }
        }

        // Páginas dinámicas de contratos
        foreach ($contracts as $contract) {
            $urls[] = [
                'loc'        => $baseUrl . '/contratos/' . $contract->id,
                'lastmod'    => $contract->updated_at->toAtomString(),
                'priority'   => '0.7',
                'changefreq' => 'monthly',
            ];
        }

        // Páginas dinámicas de registros económicos
        foreach ($economyRecords as $record) {
            $urls[] = [
                'loc'        => $baseUrl . '/economia/' . $record->id,
                'lastmod'    => $record->updated_at->toAtomString(),
                'priority'   => '0.7',
                'changefreq' => 'monthly',
            ];
        }

        // Páginas dinámicas de balances
        foreach ($balances as $balance) {
            $urls[] = [
                'loc'        => $baseUrl . '/balances/' . $balance->id,
                'lastmod'    => $balance->updated_at->toAtomString(),
                'priority'   => '0.5',
                'changefreq' => 'monthly',
            ];
        }

        $xml = $this->buildXml($urls);

        return response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=utf-8');
    }

    private function buildXml(array $urls): string
    {
        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($urls as $url) {
            $xml .= '  <url>' . "\n";
            $xml .= '    <loc>' . htmlspecialchars($url['loc'], ENT_XML1, 'UTF-8') . '</loc>' . "\n";
            if (isset($url['lastmod'])) {
                $xml .= '    <lastmod>' . $url['lastmod'] . '</lastmod>' . "\n";
            }
            if (isset($url['changefreq'])) {
                $xml .= '    <changefreq>' . $url['changefreq'] . '</changefreq>' . "\n";
            }
            $xml .= '    <priority>' . $url['priority'] . '</priority>' . "\n";
            $xml .= '  </url>' . "\n";
        }

        $xml .= '</urlset>';

        return $xml;
    }
}
