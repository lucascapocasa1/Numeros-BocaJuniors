<?php

namespace App\Services;

use App\Models\TwitterAccount;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class TwitterService
{
    private Client $client;
    private string $bearerToken;

    private const API_BASE = 'https://api.twitter.com/2';

    public function __construct(string $bearerToken)
    {
        $this->bearerToken = $bearerToken;
        $this->client = new Client([
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $bearerToken,
                'Content-Type'  => 'application/json',
            ],
        ]);
    }

    /**
     * Resolve @username to Twitter user ID, caching it on the model.
     */
    public function resolveUserId(TwitterAccount $account): string
    {
        if ($account->twitter_user_id) {
            return $account->twitter_user_id;
        }

        try {
            $response = $this->client->get(self::API_BASE . '/users/by/username/' . $account->username);
            $data     = json_decode($response->getBody()->getContents(), true);
            $userId   = $data['data']['id'] ?? null;

            if (!$userId) {
                throw new \RuntimeException("Usuario @{$account->username} no encontrado en Twitter");
            }

            $account->twitter_user_id = $userId;
            $account->save();

            return $userId;
        } catch (GuzzleException $e) {
            throw new \RuntimeException("Error al resolver @{$account->username}: " . $e->getMessage());
        }
    }

    /**
     * Fetch original tweets (no replies, no retweets, no quote tweets) since a given datetime.
     *
     * The API's exclude=retweets covers native RTs but not quote tweets. We request
     * referenced_tweets to identify and discard quotes on our side.
     */
    public function fetchTweetsSince(TwitterAccount $account, ?\DateTimeInterface $since = null): array
    {
        $userId = $this->resolveUserId($account);

        $params = [
            'max_results'  => 100,
            'exclude'      => 'replies,retweets',
            'tweet.fields' => 'created_at,text,referenced_tweets',
        ];

        if ($since !== null) {
            // X API requires RFC 3339 format and at least 10 seconds in the past
            $params['start_time'] = $since->format(\DateTimeInterface::RFC3339);
        }

        try {
            $response = $this->client->get(self::API_BASE . '/users/' . $userId . '/tweets', [
                'query' => $params,
            ]);

            $data   = json_decode($response->getBody()->getContents(), true);
            $tweets = $data['data'] ?? [];

            $result = [];
            foreach ($tweets as $t) {
                // Discard any tweet that references another: replies (replied_to) and
                // quote tweets (quoted). The API's exclude param is unreliable for replies.
                $refs = $t['referenced_tweets'] ?? [];
                if (!empty($refs)) {
                    continue;
                }

                $result[] = [
                    'id'          => $t['id'],
                    'text'        => $t['text'],
                    'created_at'  => $t['created_at'],
                    'username'    => $account->username,
                    'is_official' => $account->is_official,
                ];
            }

            return $result;
        } catch (GuzzleException $e) {
            throw new \RuntimeException("Error al obtener tweets de @{$account->username}: " . $e->getMessage());
        }
    }
}
