let selectedHost = null;

async function selectHost() {
    try {
        // Try multiple methods to get the host list
        const corsproxies = [
            "https://api.audius.co",
            "https://cors-anywhere.herokuapp.com/https://api.audius.co",
            "https://api.codetabs.com/v1/proxy?quest=https://api.audius.co"
        ];

        for (const proxyUrl of corsproxies) {
            try {
                const response = await fetch(proxyUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Accept": "application/json",
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        selectedHost = data.data[Math.floor(Math.random() * data.data.length)];
                        console.log("Selected Audius host:", selectedHost);
                        return;
                    }
                }
            } catch (e) {
                console.log(`Failed with proxy ${proxyUrl}:`, e.message);
                continue;
            }
        }

        // Fallback to known stable hosts
        const fallbackHosts = [
            "https://discoveryprovider.audius.co",
            "https://discoveryprovider1.audius.co",
            "https://audius-discovery-1.audius.co"
        ];
        selectedHost = fallbackHosts[Math.floor(Math.random() * fallbackHosts.length)];
        console.log("Using fallback Audius host:", selectedHost);
    } catch (error) {
        console.error("Failed to select host:", error);
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");
    const query = searchParams.get("q");
    const limit = searchParams.get("limit") || "20";

    console.log("API Route called:", { endpoint, query, limit });

    try {
        // Select host if not already selected
        if (!selectedHost) {
            await selectHost();
        }

        if (!selectedHost) {
            return new Response(JSON.stringify({ error: "Unable to select Audius host" }), {
                status: 503,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        let url = `${selectedHost}/v1${endpoint}`;

        // Normalize endpoint paths
        let normalizedEndpoint = endpoint;
        if (endpoint === "/trending") {
            normalizedEndpoint = "/tracks/trending";
        }

        if (normalizedEndpoint === "/tracks/trending") {
            // Try multiple hosts for trending endpoint
            const trendingHosts = [
                "https://api.audius.co",
                "https://discoveryprovider.audius.co",
                "https://discoveryprovider1.audius.co",
                "https://audius-discovery-1.audius.co",
                selectedHost
            ].filter(Boolean);

            let lastError = null;
            for (const trendingHost of trendingHosts) {
                try {
                    const trendingUrl = `${trendingHost}/v1/tracks/trending?limit=${limit}&app_name=audius-player`;
                    console.log("Trying trending URL:", trendingUrl);
                    
                    const trendingResponse = await fetch(trendingUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Accept": "application/json",
                        },
                    });

                    if (trendingResponse.ok) {
                        const trendingData = await trendingResponse.json();
                        return new Response(JSON.stringify(trendingData), {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "GET, OPTIONS",
                                "Access-Control-Allow-Headers": "Content-Type",
                            },
                        });
                    } else {
                        lastError = `Host ${trendingHost} returned ${trendingResponse.status}`;
                        console.log(lastError);
                    }
                } catch (e) {
                    lastError = `Failed to fetch from ${trendingHost}: ${e.message}`;
                    console.log(lastError);
                    continue;
                }
            }

            console.error(`All trending hosts failed. Last error: ${lastError}`);
            return new Response(JSON.stringify({ error: "Trending unavailable from all hosts", details: lastError }), {
                status: 503,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        } else if (endpoint && endpoint.startsWith("/tracks/search")) {
            if (!query) {
                return new Response(JSON.stringify({ error: "Search query required" }), {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type",
                    },
                });
            }
            // Try the API gateway directly first, then fallback to selected host
            const searchUrls = [
                `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=audius-player`,
                `${selectedHost}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=audius-player`
            ];
            
            for (const searchUrl of searchUrls) {
                try {
                    console.log("Trying search URL:", searchUrl);
                    const searchResponse = await fetch(searchUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Accept": "application/json",
                        },
                    });
                    
                    if (searchResponse.ok) {
                        const searchData = await searchResponse.json();
                        return new Response(JSON.stringify(searchData), {
                            status: 200,
                            headers: {
                                "Content-Type": "application/json",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "GET, OPTIONS",
                                "Access-Control-Allow-Headers": "Content-Type",
                            },
                        });
                    }
                } catch (e) {
                    console.log("Search URL failed:", searchUrl, e.message);
                    continue;
                }
            }
            
            return new Response(JSON.stringify({ error: "Search failed on all hosts" }), {
                status: 503,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        } else if (endpoint && endpoint.startsWith("/tracks/") && endpoint.includes("/stream")) {
            // For stream endpoint, try multiple hosts
            const streamHosts = [
                "https://api.audius.co",
                "https://discoveryprovider.audius.co",
                "https://discoveryprovider1.audius.co",
                "https://audius-discovery-1.audius.co",
                selectedHost
            ].filter(Boolean);

            let lastError = null;
            for (const streamHost of streamHosts) {
                try {
                    const streamUrl = `${streamHost}/v1${endpoint}?app_name=audius-player`;
                    console.log("Trying stream URL:", streamUrl);
                    
                    const streamResponse = await fetch(streamUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "audio/*",
                            "Accept-Language": "en-US,en;q=0.9",
                        },
                        redirect: "follow",
                        timeout: 10000
                    });

                    if (streamResponse.ok) {
                        // Return the audio stream directly
                        const buffer = await streamResponse.arrayBuffer();
                        return new Response(buffer, {
                            status: 200,
                            headers: {
                                "Content-Type": streamResponse.headers.get("content-type") || "audio/mpeg",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "GET, OPTIONS",
                                "Access-Control-Allow-Headers": "Content-Type",
                            },
                        });
                    } else {
                        lastError = `Host ${streamHost} returned ${streamResponse.status}`;
                        console.log(lastError);
                    }
                } catch (e) {
                    lastError = `Failed to fetch from ${streamHost}: ${e.message}`;
                    console.log(lastError);
                    continue;
                }
            }

            console.error(`All stream hosts failed. Last error: ${lastError}`);
            return new Response(JSON.stringify({ error: "Stream unavailable from all hosts", details: lastError }), {
                status: 503,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // Fallback for any other endpoints
        console.log("Fetching from:", url);

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        console.log("Response status:", response.status);
        const responseText = await response.text();
        console.log("Response text:", responseText.substring(0, 200));

        if (!response.ok) {
            return new Response(JSON.stringify({ error: `API returned ${response.status}`, details: responseText }), {
                status: response.status,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        try {
            const data = JSON.parse(responseText);
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        } catch (parseErr) {
            console.error("JSON parse error:", parseErr);
            return new Response(JSON.stringify({ error: "Invalid JSON response from API", details: responseText }), {
                status: 502,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }
    } catch (error) {
        console.error("API proxy error:", error);
        console.error("Error stack:", error.stack);
        selectedHost = null; // Reset host on error
        return new Response(JSON.stringify({ 
            error: error.message,
            details: error.toString()
        }), {
            status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }
    }

export async function OPTIONS(request) {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
