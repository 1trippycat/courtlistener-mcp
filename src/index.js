#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var zod_1 = require("zod");
var COURTLISTENER_API_BASE = "https://www.courtlistener.com/api/rest/v4";
var USER_AGENT = "CourtListener-MCP-Server/1.0";
// Create server instance
var server = new mcp_js_1.McpServer({
    name: "courtlistener-mcp",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Helper function for making CourtListener API requests
function makeCourtListenerRequest(endpoint_1) {
    return __awaiter(this, arguments, void 0, function (endpoint, params, authToken) {
        var url, headers, response, error_1;
        if (params === void 0) { params = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = new URL("".concat(COURTLISTENER_API_BASE).concat(endpoint));
                    // Add query parameters
                    Object.entries(params).forEach(function (_a) {
                        var key = _a[0], value = _a[1];
                        if (value) {
                            url.searchParams.append(key, value);
                        }
                    });
                    headers = {
                        "User-Agent": USER_AGENT,
                        "Accept": "application/json",
                    };
                    if (authToken) {
                        headers["Authorization"] = "Token ".concat(authToken);
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch(url.toString(), { headers: headers })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 3: return [2 /*return*/, (_a.sent())];
                case 4:
                    error_1 = _a.sent();
                    console.error("Error making CourtListener request:", error_1);
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Format docket information for display
function formatDocket(docket) {
    return [
        "**".concat(docket.case_name, "**"),
        "Docket Number: ".concat(docket.docket_number),
        "Court: ".concat(docket.court_id.toUpperCase()),
        "Date Filed: ".concat(docket.date_filed),
        "Nature of Suit: ".concat(docket.nature_of_suit),
        "Cause: ".concat(docket.cause),
        "Jurisdiction: ".concat(docket.jurisdiction_type),
        "Clusters: ".concat(docket.clusters.length),
        "URL: https://www.courtlistener.com".concat(docket.absolute_url),
        "---",
    ].join("\\n");
}
// Format opinion cluster information for display
function formatCluster(cluster) {
    return [
        "**".concat(cluster.case_name, "**"),
        "Date Filed: ".concat(cluster.date_filed),
        "Judges: ".concat(cluster.judges),
        "Federal Citation: ".concat(cluster.federal_cite_one),
        "Status: ".concat(cluster.precedential_status),
        "Citations Count: ".concat(cluster.citation_count),
        "Summary: ".concat(cluster.summary || "No summary available"),
        "Opinions: ".concat(cluster.sub_opinions.length),
        "URL: https://www.courtlistener.com".concat(cluster.absolute_url),
        "---",
    ].join("\\n");
}
// Format opinion information for display
function formatOpinion(opinion) {
    var text = opinion.html_with_citations || opinion.html || opinion.plain_text || "No text available";
    var preview = text.length > 500 ? text.substring(0, 500) + "..." : text;
    return [
        "**Opinion Type: ".concat(opinion.type, "**"),
        "Author: ".concat(opinion.author_str),
        "Per Curiam: ".concat(opinion.per_curiam ? "Yes" : "No"),
        "Page Count: ".concat(opinion.page_count || "Unknown"),
        "Preview: ".concat(preview),
        "URL: https://www.courtlistener.com".concat(opinion.absolute_url),
        "---",
    ].join("\\n");
}
// Format court information for display
function formatCourt(court) {
    return [
        "**".concat(court.full_name, "**"),
        "Short Name: ".concat(court.short_name),
        "ID: ".concat(court.id),
        "Jurisdiction: ".concat(court.jurisdiction),
        "Citation String: ".concat(court.citation_string),
        "Has Opinion Scraper: ".concat(court.has_opinion_scraper ? "Yes" : "No"),
        "Has Oral Argument Scraper: ".concat(court.has_oral_argument_scraper ? "Yes" : "No"),
        "URL: ".concat(court.url),
        "Notes: ".concat(court.notes || "No notes"),
        "---",
    ].join("\\n");
}
// Tool: Search dockets
server.tool("search-dockets", "Search for court dockets using various filters", {
    q: zod_1.z.string().optional().describe("Search query text"),
    docket_number: zod_1.z.string().optional().describe("Specific docket number to search for"),
    court: zod_1.z.string().optional().describe("Court ID (e.g., 'scotus', 'ca9', 'nysd')"),
    case_name: zod_1.z.string().optional().describe("Case name to search for"),
    date_filed_after: zod_1.z.string().optional().describe("Find cases filed after this date (YYYY-MM-DD)"),
    date_filed_before: zod_1.z.string().optional().describe("Find cases filed before this date (YYYY-MM-DD)"),
    nature_of_suit: zod_1.z.string().optional().describe("Nature of suit filter"),
    limit: zod_1.z.number().min(1).max(100).default(10).describe("Number of results to return (max 100)"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var params, data, formattedDockets, docketsText;
    var q = _b.q, docket_number = _b.docket_number, court = _b.court, case_name = _b.case_name, date_filed_after = _b.date_filed_after, date_filed_before = _b.date_filed_before, nature_of_suit = _b.nature_of_suit, limit = _b.limit, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                params = {};
                if (q)
                    params.q = q;
                if (docket_number)
                    params.docket_number = docket_number;
                if (court)
                    params.court = court;
                if (case_name)
                    params.case_name = case_name;
                if (date_filed_after)
                    params.date_filed__gte = date_filed_after;
                if (date_filed_before)
                    params.date_filed__lte = date_filed_before;
                if (nature_of_suit)
                    params.nature_of_suit = nature_of_suit;
                params.page_size = limit.toString();
                return [4 /*yield*/, makeCourtListenerRequest("/dockets/", params, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve dockets data from CourtListener API",
                                },
                            ],
                        }];
                }
                if (data.results.length === 0) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "No dockets found matching the search criteria",
                                },
                            ],
                        }];
                }
                formattedDockets = data.results.map(formatDocket);
                docketsText = "Found ".concat(data.count, " dockets (showing ").concat(data.results.length, "):\\n\\n").concat(formattedDockets.join("\\n"));
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: docketsText,
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: Get specific docket
server.tool("get-docket", "Get detailed information about a specific docket by ID", {
    docket_id: zod_1.z.number().describe("The ID of the docket to retrieve"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var data, formattedDocket;
    var docket_id = _b.docket_id, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, makeCourtListenerRequest("/dockets/".concat(docket_id, "/"), {}, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve docket ".concat(docket_id, " from CourtListener API"),
                                },
                            ],
                        }];
                }
                formattedDocket = formatDocket(data);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Docket Details:\\n\\n".concat(formattedDocket),
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: Search opinion clusters
server.tool("search-clusters", "Search for opinion clusters (groups of related opinions)", {
    q: zod_1.z.string().optional().describe("Search query text"),
    case_name: zod_1.z.string().optional().describe("Case name to search for"),
    court: zod_1.z.string().optional().describe("Court ID (e.g., 'scotus', 'ca9')"),
    date_filed_after: zod_1.z.string().optional().describe("Find cases filed after this date (YYYY-MM-DD)"),
    date_filed_before: zod_1.z.string().optional().describe("Find cases filed before this date (YYYY-MM-DD)"),
    precedential_status: zod_1.z.string().optional().describe("Precedential status (e.g., 'Published', 'Unpublished')"),
    citation: zod_1.z.string().optional().describe("Citation to search for"),
    limit: zod_1.z.number().min(1).max(100).default(10).describe("Number of results to return (max 100)"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var params, data, formattedClusters, clustersText;
    var q = _b.q, case_name = _b.case_name, court = _b.court, date_filed_after = _b.date_filed_after, date_filed_before = _b.date_filed_before, precedential_status = _b.precedential_status, citation = _b.citation, limit = _b.limit, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                params = {};
                if (q)
                    params.q = q;
                if (case_name)
                    params.case_name = case_name;
                if (court)
                    params.docket__court = court;
                if (date_filed_after)
                    params.date_filed__gte = date_filed_after;
                if (date_filed_before)
                    params.date_filed__lte = date_filed_before;
                if (precedential_status)
                    params.precedential_status = precedential_status;
                if (citation)
                    params.citation = citation;
                params.page_size = limit.toString();
                return [4 /*yield*/, makeCourtListenerRequest("/clusters/", params, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve clusters data from CourtListener API",
                                },
                            ],
                        }];
                }
                if (data.results.length === 0) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "No opinion clusters found matching the search criteria",
                                },
                            ],
                        }];
                }
                formattedClusters = data.results.map(formatCluster);
                clustersText = "Found ".concat(data.count, " opinion clusters (showing ").concat(data.results.length, "):\\n\\n").concat(formattedClusters.join("\\n"));
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: clustersText,
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: Get specific cluster
server.tool("get-cluster", "Get detailed information about a specific opinion cluster by ID", {
    cluster_id: zod_1.z.number().describe("The ID of the cluster to retrieve"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var data, formattedCluster;
    var cluster_id = _b.cluster_id, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, makeCourtListenerRequest("/clusters/".concat(cluster_id, "/"), {}, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve cluster ".concat(cluster_id, " from CourtListener API"),
                                },
                            ],
                        }];
                }
                formattedCluster = formatCluster(data);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Opinion Cluster Details:\\n\\n".concat(formattedCluster),
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: Search opinions
server.tool("search-opinions", "Search for individual court opinions", {
    q: zod_1.z.string().optional().describe("Search query text"),
    type: zod_1.z.string().optional().describe("Opinion type (e.g., 'Lead Opinion', 'Concurrence', 'Dissent')"),
    author: zod_1.z.string().optional().describe("Author name or ID"),
    court: zod_1.z.string().optional().describe("Court ID (e.g., 'scotus', 'ca9')"),
    date_created_after: zod_1.z.string().optional().describe("Find opinions created after this date (YYYY-MM-DD)"),
    date_created_before: zod_1.z.string().optional().describe("Find opinions created before this date (YYYY-MM-DD)"),
    limit: zod_1.z.number().min(1).max(100).default(10).describe("Number of results to return (max 100)"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var params, data, formattedOpinions, opinionsText;
    var q = _b.q, type = _b.type, author = _b.author, court = _b.court, date_created_after = _b.date_created_after, date_created_before = _b.date_created_before, limit = _b.limit, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                params = {};
                if (q)
                    params.q = q;
                if (type)
                    params.type = type;
                if (author)
                    params.author_str = author;
                if (court)
                    params.cluster__docket__court = court;
                if (date_created_after)
                    params.date_created__gte = date_created_after;
                if (date_created_before)
                    params.date_created__lte = date_created_before;
                params.page_size = limit.toString();
                return [4 /*yield*/, makeCourtListenerRequest("/opinions/", params, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve opinions data from CourtListener API",
                                },
                            ],
                        }];
                }
                if (data.results.length === 0) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "No opinions found matching the search criteria",
                                },
                            ],
                        }];
                }
                formattedOpinions = data.results.map(formatOpinion);
                opinionsText = "Found ".concat(data.count, " opinions (showing ").concat(data.results.length, "):\\n\\n").concat(formattedOpinions.join("\\n"));
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: opinionsText,
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: Get specific opinion
server.tool("get-opinion", "Get detailed information about a specific opinion by ID", {
    opinion_id: zod_1.z.number().describe("The ID of the opinion to retrieve"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var data, formattedOpinion;
    var opinion_id = _b.opinion_id, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, makeCourtListenerRequest("/opinions/".concat(opinion_id, "/"), {}, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve opinion ".concat(opinion_id, " from CourtListener API"),
                                },
                            ],
                        }];
                }
                formattedOpinion = formatOpinion(data);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Opinion Details:\\n\\n".concat(formattedOpinion),
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: List courts
server.tool("list-courts", "Get a list of available courts", {
    jurisdiction: zod_1.z.string().optional().describe("Filter by jurisdiction (e.g., 'F' for Federal, 'S' for State)"),
    in_use: zod_1.z.boolean().optional().describe("Filter to only courts currently in use"),
    has_opinion_scraper: zod_1.z.boolean().optional().describe("Filter to courts with opinion scrapers"),
    limit: zod_1.z.number().min(1).max(100).default(20).describe("Number of results to return (max 100)"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var params, data, formattedCourts, courtsText;
    var jurisdiction = _b.jurisdiction, in_use = _b.in_use, has_opinion_scraper = _b.has_opinion_scraper, limit = _b.limit, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                params = {};
                if (jurisdiction)
                    params.jurisdiction = jurisdiction;
                if (in_use !== undefined)
                    params.in_use = in_use.toString();
                if (has_opinion_scraper !== undefined)
                    params.has_opinion_scraper = has_opinion_scraper.toString();
                params.page_size = limit.toString();
                return [4 /*yield*/, makeCourtListenerRequest("/courts/", params, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve courts data from CourtListener API",
                                },
                            ],
                        }];
                }
                if (data.results.length === 0) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "No courts found matching the criteria",
                                },
                            ],
                        }];
                }
                formattedCourts = data.results.map(formatCourt);
                courtsText = "Found ".concat(data.count, " courts (showing ").concat(data.results.length, "):\\n\\n").concat(formattedCourts.join("\\n"));
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: courtsText,
                            },
                        ],
                    }];
        }
    });
}); });
// Tool: Get specific court
server.tool("get-court", "Get detailed information about a specific court by ID", {
    court_id: zod_1.z.string().describe("The ID of the court to retrieve (e.g., 'scotus', 'ca9', 'nysd')"),
    auth_token: zod_1.z.string().optional().describe("CourtListener API authentication token (optional)")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var data, formattedCourt;
    var court_id = _b.court_id, auth_token = _b.auth_token;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, makeCourtListenerRequest("/courts/".concat(court_id, "/"), {}, auth_token)];
            case 1:
                data = _c.sent();
                if (!data) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to retrieve court ".concat(court_id, " from CourtListener API"),
                                },
                            ],
                        }];
                }
                formattedCourt = formatCourt(data);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Court Details:\\n\\n".concat(formattedCourt),
                            },
                        ],
                    }];
        }
    });
}); });
// Main function to run the server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error("CourtListener MCP Server running on stdio");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
