<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Mail;

class ContactController extends Controller
{
    public function send(Request $request)
    {
        $this->validate($request, [
            'message' => 'required|string|min:10|max:2000',
            'email'   => 'nullable|email|max:255',
        ]);

        $adminEmail  = env('ADMIN_EMAIL');
        if (!$adminEmail) {
            return response()->json(['error' => 'Contact not configured.'], 500);
        }

        $userEmail   = $request->input('email');
        $userMessage = $request->input('message');

        $body = $userMessage . ($userEmail ? "\n\nRemitente: {$userEmail}" : '');

        Mail::raw($body, function ($message) use ($adminEmail, $userEmail) {
            $message->to($adminEmail)
                    ->subject('Números Azules – Aporte / Corrección');

            if ($userEmail) {
                $message->replyTo($userEmail);
            }
        });

        return response()->json(['message' => 'Mensaje enviado. ¡Gracias!']);
    }
}
