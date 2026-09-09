<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\TwitterAccount;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TwitterController extends Controller
{
    public function index(): JsonResponse
    {
        $accounts = TwitterAccount::orderBy('username')->get();
        return response()->json(['data' => $accounts]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->validate($request, [
            'username'    => 'required|string|max:100|unique:twitter_accounts,username',
            'is_official' => 'sometimes|boolean',
        ]);

        $account = TwitterAccount::create([
            'username'        => ltrim($request->input('username'), '@'),
            'is_official'     => $request->input('is_official', false),
            'last_checked_at' => Carbon::now(),
        ]);

        return response()->json(['data' => $account], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = TwitterAccount::findOrFail($id);

        $this->validate($request, [
            'username'    => 'sometimes|string|max:100|unique:twitter_accounts,username,' . $id,
            'is_official' => 'sometimes|boolean',
        ]);

        if ($request->has('username')) {
            $account->username = ltrim($request->input('username'), '@');
            $account->twitter_user_id = null;
        }

        if ($request->has('is_official')) {
            $account->is_official = $request->input('is_official');
        }

        $account->save();

        return response()->json(['data' => $account]);
    }

    public function destroy(int $id): JsonResponse
    {
        TwitterAccount::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
