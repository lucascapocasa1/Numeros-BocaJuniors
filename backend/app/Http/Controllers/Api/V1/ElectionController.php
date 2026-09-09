<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ElectionCandidate;
use App\Models\ElectionCommitment;
use App\Models\ElectionList;
use App\Models\ElectionProposal;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ElectionController extends Controller
{
    // ─── Public ──────────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $lists = ElectionList::with(['candidates', 'proposals.commitments'])->orderBy('name')->get();

        $data = $lists->map(fn (ElectionList $list) => $this->serializeList($list));

        return response()->json(['data' => $data]);
    }

    /**
     * Accessible via a stable per-list token, regardless of whether the
     * "Elecciones" section is enabled — used to share a list's content with
     * itself for validation before the section goes public.
     */
    public function showByToken(string $token): JsonResponse
    {
        $list = ElectionList::with(['candidates', 'proposals.commitments'])
            ->where('token', $token)
            ->firstOrFail();

        return response()->json(['data' => $this->serializeList($list, includePrivate: true)]);
    }

    /**
     * Accessible via a stable public slug — but only while the "Elecciones"
     * section is enabled, unlike showByToken which is always reachable.
     */
    public function showBySlug(string $slug): JsonResponse
    {
        if (!$this->isSectionEnabled()) {
            abort(404);
        }

        $list = ElectionList::with(['candidates', 'proposals.commitments'])
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json(['data' => $this->serializeList($list)]);
    }

    /**
     * $includePrivate expone campos que solo deben viajar en respuestas
     * autenticadas (admin) o accedidas con el token privado de validación:
     * el `token` en sí (permitiría acceder al link privado) y
     * `no_commitments_reason` (nota interna, no pensada para el público).
     */
    private function serializeList(ElectionList $list, bool $includePrivate = false): array
    {
        return [
            'id'         => $list->id,
            'slug'       => $list->slug,
            'name'       => $list->name,
            'source_url' => $list->source_url,
            'has_logo'   => !empty($list->logo_path),
            ...($includePrivate ? ['token' => $list->token] : []),
            'candidates' => $list->candidates->map(function (ElectionCandidate $candidate) {
                return [
                    'id'         => $candidate->id,
                    'first_name' => $candidate->first_name,
                    'last_name'  => $candidate->last_name,
                    'position'   => $candidate->position,
                    'has_photo'  => !empty($candidate->photo_path),
                    'has_cv'     => !empty($candidate->cv_path),
                    'order'      => $candidate->order,
                ];
            }),
            'proposals' => $list->proposals->map(function (ElectionProposal $proposal) use ($includePrivate) {
                return [
                    'id'                     => $proposal->id,
                    'title'                  => $proposal->title,
                    'description'            => $proposal->description,
                    ...($includePrivate ? ['no_commitments_reason' => $proposal->no_commitments_reason] : []),
                    'order'                  => $proposal->order,
                    'commitments' => $proposal->commitments->map(function (ElectionCommitment $commitment) {
                        return [
                            'id'           => $commitment->id,
                            'kind'         => $commitment->kind,
                            'description'  => $commitment->description,
                            'metric_value' => $commitment->metric_value,
                            'metric_unit'  => $commitment->metric_unit,
                            'deadline'     => $commitment->deadline,
                            'order'        => $commitment->order,
                        ];
                    }),
                ];
            }),
        ];
    }

    public function logo(int $id)
    {
        $list = ElectionList::findOrFail($id);

        if (!$list->logo_path || !Storage::disk('local')->exists($list->logo_path)) {
            return response()->json(['error' => 'Logo no disponible'], 404);
        }

        return response()->file(Storage::disk('local')->path($list->logo_path));
    }

    public function candidatePhoto(int $id)
    {
        $candidate = ElectionCandidate::findOrFail($id);

        if (!$candidate->photo_path || !Storage::disk('local')->exists($candidate->photo_path)) {
            return response()->json(['error' => 'Foto no disponible'], 404);
        }

        return response()->file(Storage::disk('local')->path($candidate->photo_path));
    }

    public function candidateCv(int $id)
    {
        $candidate = ElectionCandidate::findOrFail($id);

        if (!$candidate->cv_path || !Storage::disk('local')->exists($candidate->cv_path)) {
            return response()->json(['error' => 'CV no disponible'], 404);
        }

        $path     = Storage::disk('local')->path($candidate->cv_path);
        $fileName = $candidate->cv_original_name ?: basename($candidate->cv_path);

        return response()->download($path, $fileName);
    }

    // ─── Admin: Lists ───────────────────────────────────────────────────────

    /**
     * Listado para la administración: incluye `token` y `no_commitments_reason`,
     * que el índice público no expone.
     */
    public function adminIndex(): JsonResponse
    {
        $lists = ElectionList::with(['candidates', 'proposals.commitments'])->orderBy('name')->get();

        $data = $lists->map(fn (ElectionList $list) => $this->serializeList($list, includePrivate: true));

        return response()->json(['data' => $data]);
    }

    public function storeList(Request $request): JsonResponse
    {
        $this->validate($request, [
            'name'       => 'required|string|max:255',
            'source_url' => 'nullable|string|max:500',
            'logo'       => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $logoPath         = null;
        $logoOriginalName = null;

        if ($request->hasFile('logo') && $request->file('logo')->isValid()) {
            $logo             = $request->file('logo');
            $logoOriginalName = $logo->getClientOriginalName();
            $logoPath         = $this->storeFile($logo, 'elections/logos');
        }

        $list = ElectionList::create([
            'token'               => $this->generateUniqueToken(),
            'slug'                => $this->generateUniqueSlug($request->input('name')),
            'name'                => $request->input('name'),
            'source_url'          => $request->input('source_url'),
            'logo_path'           => $logoPath,
            'logo_original_name'  => $logoOriginalName,
        ]);

        return response()->json(['data' => $list], 201);
    }

    public function updateList(Request $request, int $id): JsonResponse
    {
        $list = ElectionList::findOrFail($id);

        $this->validate($request, [
            'name'       => 'sometimes|string|max:255',
            'source_url' => 'nullable|string|max:500',
            'logo'       => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        if ($request->hasFile('logo') && $request->file('logo')->isValid()) {
            if ($list->logo_path) {
                Storage::disk('local')->delete($list->logo_path);
            }
            $logo = $request->file('logo');
            $list->logo_original_name = $logo->getClientOriginalName();
            $list->logo_path          = $this->storeFile($logo, 'elections/logos');
        }

        $list->fill($request->only(['name', 'source_url']));
        $list->save();

        return response()->json(['data' => $list]);
    }

    public function destroyList(int $id): JsonResponse
    {
        $list = ElectionList::with('candidates')->findOrFail($id);

        if ($list->logo_path) {
            Storage::disk('local')->delete($list->logo_path);
        }

        foreach ($list->candidates as $candidate) {
            if ($candidate->photo_path) {
                Storage::disk('local')->delete($candidate->photo_path);
            }
            if ($candidate->cv_path) {
                Storage::disk('local')->delete($candidate->cv_path);
            }
        }

        $list->delete();

        return response()->json(['message' => 'Lista eliminada'], 200);
    }

    // ─── Admin: Candidates ──────────────────────────────────────────────────

    public function storeCandidate(Request $request, int $listId): JsonResponse
    {
        $list = ElectionList::findOrFail($listId);

        $this->validate($request, [
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'position'   => 'required|string|max:255',
            'order'      => 'sometimes|integer|min:0',
            'photo'      => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'cv'         => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        $photoPath         = null;
        $photoOriginalName = null;
        if ($request->hasFile('photo') && $request->file('photo')->isValid()) {
            $photo             = $request->file('photo');
            $photoOriginalName = $photo->getClientOriginalName();
            $photoPath         = $this->storeFile($photo, 'elections/photos');
        }

        $cvPath         = null;
        $cvOriginalName = null;
        if ($request->hasFile('cv') && $request->file('cv')->isValid()) {
            $cv             = $request->file('cv');
            $cvOriginalName = $cv->getClientOriginalName();
            $cvPath         = $this->storeFile($cv, 'elections/cvs');
        }

        $candidate = $list->candidates()->create([
            'first_name'           => $request->input('first_name'),
            'last_name'            => $request->input('last_name'),
            'position'             => $request->input('position'),
            'order'                => $request->input('order', 0),
            'photo_path'           => $photoPath,
            'photo_original_name'  => $photoOriginalName,
            'cv_path'              => $cvPath,
            'cv_original_name'     => $cvOriginalName,
        ]);

        return response()->json(['data' => $candidate], 201);
    }

    public function updateCandidate(Request $request, int $id): JsonResponse
    {
        $candidate = ElectionCandidate::findOrFail($id);

        $this->validate($request, [
            'first_name' => 'sometimes|string|max:255',
            'last_name'  => 'sometimes|string|max:255',
            'position'   => 'sometimes|string|max:255',
            'order'      => 'sometimes|integer|min:0',
            'photo'      => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'cv'         => 'nullable|file|mimes:pdf,doc,docx|max:10240',
        ]);

        if ($request->hasFile('photo') && $request->file('photo')->isValid()) {
            if ($candidate->photo_path) {
                Storage::disk('local')->delete($candidate->photo_path);
            }
            $photo = $request->file('photo');
            $candidate->photo_original_name = $photo->getClientOriginalName();
            $candidate->photo_path          = $this->storeFile($photo, 'elections/photos');
        }

        if ($request->hasFile('cv') && $request->file('cv')->isValid()) {
            if ($candidate->cv_path) {
                Storage::disk('local')->delete($candidate->cv_path);
            }
            $cv = $request->file('cv');
            $candidate->cv_original_name = $cv->getClientOriginalName();
            $candidate->cv_path          = $this->storeFile($cv, 'elections/cvs');
        }

        $candidate->fill($request->only(['first_name', 'last_name', 'position', 'order']));
        $candidate->save();

        return response()->json(['data' => $candidate]);
    }

    public function destroyCandidate(int $id): JsonResponse
    {
        $candidate = ElectionCandidate::findOrFail($id);

        if ($candidate->photo_path) {
            Storage::disk('local')->delete($candidate->photo_path);
        }
        if ($candidate->cv_path) {
            Storage::disk('local')->delete($candidate->cv_path);
        }

        $candidate->delete();

        return response()->json(['message' => 'Candidato eliminado'], 200);
    }

    // ─── Admin: Proposals ───────────────────────────────────────────────────

    public function storeProposal(Request $request, int $listId): JsonResponse
    {
        $list = ElectionList::findOrFail($listId);

        $this->validate($request, [
            'title'                  => 'required|string|max:255',
            'description'            => 'required|string',
            'no_commitments_reason'  => 'nullable|string',
            'order'                  => 'sometimes|integer|min:0',
        ]);

        $proposal = $list->proposals()->create($request->only(['title', 'description', 'no_commitments_reason', 'order']));

        return response()->json(['data' => $proposal], 201);
    }

    public function updateProposal(Request $request, int $id): JsonResponse
    {
        $proposal = ElectionProposal::findOrFail($id);

        $this->validate($request, [
            'title'                  => 'sometimes|string|max:255',
            'description'            => 'sometimes|string',
            'no_commitments_reason'  => 'nullable|string',
            'order'                  => 'sometimes|integer|min:0',
        ]);

        $proposal->update($request->only(['title', 'description', 'no_commitments_reason', 'order']));

        return response()->json(['data' => $proposal]);
    }

    public function destroyProposal(int $id): JsonResponse
    {
        $proposal = ElectionProposal::findOrFail($id);
        $proposal->delete();

        return response()->json(['message' => 'Propuesta eliminada'], 200);
    }

    // ─── Admin: Commitments ─────────────────────────────────────────────────

    public function storeCommitment(Request $request, int $proposalId): JsonResponse
    {
        $proposal = ElectionProposal::findOrFail($proposalId);

        $this->validate($request, [
            'kind'         => 'sometimes|in:compromiso,meta',
            'description'  => 'required|string',
            'metric_value' => 'nullable|numeric',
            'metric_unit'  => 'nullable|string|max:100',
            'deadline'     => 'nullable|string|max:100',
            'order'        => 'sometimes|integer|min:0',
        ]);

        $commitment = $proposal->commitments()->create(
            $request->only(['kind', 'description', 'metric_value', 'metric_unit', 'deadline', 'order'])
        );

        return response()->json(['data' => $commitment], 201);
    }

    public function updateCommitment(Request $request, int $id): JsonResponse
    {
        $commitment = ElectionCommitment::findOrFail($id);

        $this->validate($request, [
            'kind'         => 'sometimes|in:compromiso,meta',
            'description'  => 'sometimes|string',
            'metric_value' => 'nullable|numeric',
            'metric_unit'  => 'nullable|string|max:100',
            'deadline'     => 'nullable|string|max:100',
            'order'        => 'sometimes|integer|min:0',
        ]);

        $commitment->update($request->only(['kind', 'description', 'metric_value', 'metric_unit', 'deadline', 'order']));

        return response()->json(['data' => $commitment]);
    }

    public function destroyCommitment(int $id): JsonResponse
    {
        $commitment = ElectionCommitment::findOrFail($id);
        $commitment->delete();

        return response()->json(['message' => 'Compromiso eliminado'], 200);
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private function storeFile(\Illuminate\Http\UploadedFile $file, string $folder): string
    {
        Storage::disk('local')->makeDirectory($folder);

        $path = $file->store($folder, 'local');

        if ($path === false || $path === '') {
            throw new \RuntimeException('No se pudo guardar el archivo. Verificá los permisos del directorio de almacenamiento.');
        }

        return $path;
    }

    private function generateUniqueToken(): string
    {
        do {
            $token = bin2hex(random_bytes(16));
        } while (ElectionList::where('token', $token)->exists());

        return $token;
    }

    private function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'lista';
        $slug = $base;
        $suffix = 2;

        while (ElectionList::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $suffix;
            $suffix++;
        }

        return $slug;
    }

    private function isSectionEnabled(): bool
    {
        return Setting::get('section_elecciones_enabled', '0') === '1';
    }
}
