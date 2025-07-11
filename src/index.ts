#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const COURTLISTENER_API_BASE = "https://www.courtlistener.com/api/rest/v4";
const USER_AGENT = process.env.USER_AGENT || "CourtListener-MCP-Server/1.0";

// Security configuration - configurable via environment variables
const MAX_RESULTS_LIMIT = 100;
const MIN_RESULTS_LIMIT = 1;
const DEFAULT_RESULTS_LIMIT = 10;
const MAX_REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS || "30000", 10);
const MAX_TEXT_PREVIEW_LENGTH = 500;
const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || "100", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);

// Input validation schemas
const authTokenSchema = z.string().regex(/^[a-f0-9]{40}$/, "Invalid API token format").optional();
const courtIdSchema = z.string().regex(/^[a-z0-9]+$/, "Invalid court ID format");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
const limitSchema = z.number().min(MIN_RESULTS_LIMIT).max(MAX_RESULTS_LIMIT);

// Create server instance
export const server = new McpServer({
  name: "courtlistener-mcp",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

// Types for CourtListener API responses
interface DocketResponse {
  id: number;
  court: string;
  court_id: string;
  docket_number: string;
  case_name: string;
  case_name_short: string;
  case_name_full: string;
  slug: string;
  date_created: string;
  date_modified: string;
  date_filed: string;
  date_terminated?: string;
  nature_of_suit: string;
  cause: string;
  jury_demand: string;
  jurisdiction_type: string;
  clusters: string[];
  audio_files: string[];
  assigned_to?: string;
  referred_to?: string;
  absolute_url: string;
}

// RECAP/PACER API response types
interface DocketEntryResponse {
  id: number;
  docket: string;
  date_created: string;
  date_modified: string;
  date_filed: string;
  entry_number: number;
  recap_sequence_number?: number;
  pacer_sequence_number?: number;
  description: string;
  time_logged?: string;
  short_description?: string;
  tags: string[];
  absolute_url: string;
}

interface PartyResponse {
  id: number;
  docket: string;
  party_types: Array<{
    name: string;
    party: string;
    docket: string;
    date_terminated?: string;
    extra_info?: string;
  }>;
  name: string;
  extra_info?: string;
  date_terminated?: string;
  attorneys: string[];
  absolute_url: string;
}

interface AttorneyResponse {
  id: number;
  docket: string;
  name: string;
  contact_raw?: string;
  phone?: string;
  fax?: string;
  email?: string;
  date_terminated?: string;
  roles: Array<{
    attorney: string;
    party: string;
    role: string;
    date_action?: string;
  }>;
  parties_represented: string[];
  absolute_url: string;
}

interface RECAPDocumentResponse {
  id: number;
  docket_entry: string;
  date_created: string;
  date_modified: string;
  date_upload?: string;
  document_type: string;
  document_number?: number;
  attachment_number?: number;
  pacer_doc_id?: string;
  is_available: boolean;
  is_free_on_pacer: boolean;
  is_sealed: boolean;
  filepath_local?: string;
  filepath_ia?: string;
  ia_upload_failure_count?: number;
  thumbnail?: string;
  thumbnail_status: string;
  plain_text?: string;
  ocr_status?: string;
  description: string;
  page_count?: number;
  file_size?: number;
  absolute_url: string;
}

interface OriginatingCourtInfoResponse {
  id: number;
  docket: string;
  date_created: string;
  date_modified: string;
  date_disposed?: string;
  date_filed?: string;
  date_judgment?: string;
  date_judgment_eod?: string;
  date_received_coa?: string;
  assigned_to_str?: string;
  ordering_judge_str?: string;
  court_reporter?: string;
  docket_number: string;
  appellate_fee_status?: string;
  appellate_case_type_information?: string;
  absolute_url: string;
}

interface FJCIntegratedDatabaseResponse {
  id: number;
  docket: string;
  date_created: string;
  date_modified: string;
  dataset_source: string;
  office: number;
  docket_number: string;
  origin: number;
  date_filed?: string;
  jurisdiction: number;
  nos: number;
  plaintiff: string;
  defendant: string;
  nature_of_suit: string;
  cause: string;
  jury_demand: string;
  disposition: string;
  date_of_disposition?: string;
  procedural_progress: number;
  district_id: number;
  transfer_origin?: string;
  transfer_date?: string;
  transfer_location?: string;
  arbitration_at_filing: number;
  arbitration_at_disposition: number;
  multidistrict_litigation_docket_number?: string;
  plaintiff_state?: string;
  plaintiff_zip_code?: string;
  defendant_state?: string;
  pro_se: number;
  year_of_tape: number;
  absolute_url: string;
}

interface OpinionClusterResponse {
  id: number;
  docket: string;
  judges: string;
  date_created: string;
  date_modified: string;
  date_filed: string;
  slug: string;
  case_name: string;
  case_name_short: string;
  case_name_full: string;
  federal_cite_one: string;
  federal_cite_two: string;
  federal_cite_three: string;
  state_cite_one: string;
  state_cite_two: string;
  state_cite_three: string;
  neutral_cite: string;
  scdb_id: string;
  scdb_decision_direction: number;
  scdb_votes_majority: number;
  scdb_votes_minority: number;
  source: string;
  procedural_history: string;
  attorneys: string;
  nature_of_suit: string;
  posture: string;
  syllabus: string;
  headnotes: string;
  summary: string;
  disposition: string;
  history: string;
  other_dates: string;
  cross_reference: string;
  correction: string;
  citation_count: number;
  precedential_status: string;
  date_blocked?: string;
  blocked: boolean;
  sub_opinions: string[];
  absolute_url: string;
}

interface OpinionResponse {
  id: number;
  cluster: string;
  author: string;
  author_str: string;
  per_curiam: boolean;
  joined_by: string[];
  type: string;
  sha1: string;
  page_count?: number;
  download_url?: string;
  local_path?: string;
  plain_text: string;
  html: string;
  html_lawbox: string;
  html_columbia: string;
  html_anon_2020: string;
  xml_harvard: string;
  html_with_citations: string;
  extracted_by_ocr: boolean;
  date_created: string;
  date_modified: string;
  absolute_url: string;
}

interface CourtResponse {
  id: string;
  pacer_court_id?: number;
  pacer_has_rss_feed: boolean;
  pacer_rss_entry_types: string;
  date_last_pacer_contact?: string;
  fjc_court_id?: string;
  date_modified: string;
  in_use: boolean;
  has_opinion_scraper: boolean;
  has_oral_argument_scraper: boolean;
  position: number;
  citation_string: string;
  short_name: string;
  full_name: string;
  url: string;
  start_date?: string;
  end_date?: string;
  jurisdiction: string;
  notes: string;
}

interface ApiListResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Helper function for making CourtListener API requests - exported for testing
export async function makeCourtListenerRequest<T>(
  endpoint: string,
  params: Record<string, string> = {},
  authToken?: string
): Promise<T | null> {
  try {
    // Validate auth token format if provided
    if (authToken && !validateApiToken(authToken)) {
      console.error("Invalid API token format provided");
      return null;
    }

    // Check rate limiting
    const clientId = authToken ? `token:${authToken.substring(0, 8)}` : 'anonymous';
    if (!rateLimiter.isAllowed(clientId)) {
      console.error("Rate limit exceeded for client");
      return null;
    }

    const url = new URL(`${COURTLISTENER_API_BASE}${endpoint}`);
    
    // Validate and sanitize query parameters
    const sanitizedParams = validateAndSanitizeParams(params);
    Object.entries(sanitizedParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });

    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Token ${authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAX_REQUEST_TIMEOUT);

    const response = await fetch(url.toString(), { 
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Don't leak sensitive information in error messages
      const statusCode = response.status;
      if (statusCode === 401) {
        console.error("Authentication failed - invalid API token");
      } else if (statusCode === 429) {
        console.error("Rate limited by CourtListener API");
      } else if (statusCode >= 500) {
        console.error("CourtListener API server error");
      } else {
        console.error(`CourtListener API request failed with status: ${statusCode}`);
      }
      return null;
    }

    const data = await response.json();
    const normalizedData = normalizeApiResponse<T>(data);
    return normalizedData as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error("Request timeout");
      } else {
        console.error("Network error occurred");
      }
    } else {
      console.error("Unknown error occurred");
    }
    return null;
  }
}

// Format docket information for display
function formatDocket(docket: DocketResponse): string {
  return [
    `**${docket.case_name}**`,
    `Docket Number: ${docket.docket_number}`,
    `Court: ${docket.court_id.toUpperCase()}`,
    `Date Filed: ${docket.date_filed}`,
    `Nature of Suit: ${docket.nature_of_suit}`,
    `Cause: ${docket.cause}`,
    `Jurisdiction: ${docket.jurisdiction_type}`,
    `Clusters: ${docket.clusters.length}`,
    `URL: https://www.courtlistener.com${docket.absolute_url}`,
    "---",
  ].join("\\n");
}

// Format opinion cluster information for display
function formatCluster(cluster: OpinionClusterResponse): string {
  return [
    `**${cluster.case_name}**`,
    `Date Filed: ${cluster.date_filed}`,
    `Judges: ${cluster.judges}`,
    `Federal Citation: ${cluster.federal_cite_one}`,
    `Status: ${cluster.precedential_status}`,
    `Citations Count: ${cluster.citation_count}`,
    `Summary: ${cluster.summary || "No summary available"}`,
    `Opinions: ${cluster.sub_opinions.length}`,
    `URL: https://www.courtlistener.com${cluster.absolute_url}`,
    "---",
  ].join("\\n");
}

// Format opinion information for display
function formatOpinion(opinion: OpinionResponse): string {
  const text = opinion.html_with_citations || opinion.html || opinion.plain_text || "No text available";
  const preview = text.length > MAX_TEXT_PREVIEW_LENGTH ? 
    sanitizeString(text.substring(0, MAX_TEXT_PREVIEW_LENGTH)) + "..." : 
    sanitizeString(text);
  
  return [
    `**Opinion Type: ${sanitizeString(opinion.type)}**`,
    `Author: ${sanitizeString(opinion.author_str)}`,
    `Per Curiam: ${opinion.per_curiam ? "Yes" : "No"}`,
    `Page Count: ${opinion.page_count || "Unknown"}`,
    `Preview: ${preview}`,
    `URL: https://www.courtlistener.com${sanitizeString(opinion.absolute_url)}`,
    "---",
  ].join("\\n");
}

// Format court information for display
function formatCourt(court: CourtResponse): string {
  return [
    `**${court.full_name}**`,
    `Short Name: ${court.short_name}`,
    `ID: ${court.id}`,
    `Jurisdiction: ${court.jurisdiction}`,
    `Citation String: ${court.citation_string}`,
    `Has Opinion Scraper: ${court.has_opinion_scraper ? "Yes" : "No"}`,
    `Has Oral Argument Scraper: ${court.has_oral_argument_scraper ? "Yes" : "No"}`,
    `URL: ${court.url}`,
    `Notes: ${court.notes || "No notes"}`,
    "---",
  ].join("\\n");
}

// Format docket entry information for display
function formatDocketEntry(entry: DocketEntryResponse): string {
  return [
    `**Entry #${entry.entry_number}**`,
    `Date Filed: ${entry.date_filed}`,
    `Description: ${entry.description}`,
    `Short Description: ${entry.short_description || "N/A"}`,
    `Time Logged: ${entry.time_logged || "N/A"}`,
    `RECAP Sequence: ${entry.recap_sequence_number || "N/A"}`,
    `PACER Sequence: ${entry.pacer_sequence_number || "N/A"}`,
    `Tags: ${entry.tags.length > 0 ? entry.tags.join(", ") : "None"}`,
    `URL: https://www.courtlistener.com${entry.absolute_url}`,
    "---",
  ].join("\\n");
}

// Format party information for display
function formatParty(party: PartyResponse): string {
  const partyTypes = party.party_types.map(pt => 
    `${pt.name}${pt.extra_info ? ` (${pt.extra_info})` : ""}${pt.date_terminated ? ` - Terminated: ${pt.date_terminated}` : ""}`
  ).join(", ");
  
  return [
    `**${party.name}**`,
    `Party Types: ${partyTypes}`,
    `Extra Info: ${party.extra_info || "None"}`,
    `Date Terminated: ${party.date_terminated || "Not terminated"}`,
    `Attorneys: ${party.attorneys.length}`,
    `URL: https://www.courtlistener.com${party.absolute_url}`,
    "---",
  ].join("\\n");
}

// Format attorney information for display
function formatAttorney(attorney: AttorneyResponse): string {
  const roles = attorney.roles.map(role => 
    `${role.role}${role.date_action ? ` (${role.date_action})` : ""}`
  ).join(", ");
  
  return [
    `**${attorney.name}**`,
    `Contact: ${attorney.contact_raw || "No contact info"}`,
    `Phone: ${attorney.phone || "N/A"}`,
    `Email: ${attorney.email || "N/A"}`,
    `Fax: ${attorney.fax || "N/A"}`,
    `Roles: ${roles}`,
    `Parties Represented: ${attorney.parties_represented.length}`,
    `Date Terminated: ${attorney.date_terminated || "Not terminated"}`,
    `URL: https://www.courtlistener.com${attorney.absolute_url}`,
    "---",
  ].join("\\n");
}

// Format RECAP document information for display
function formatRECAPDocument(doc: RECAPDocumentResponse): string {
  const textPreview = doc.plain_text ? 
    (doc.plain_text.length > 300 ? doc.plain_text.substring(0, 300) + "..." : doc.plain_text) : 
    "No text available";
  
  return [
    `**Document #${doc.document_number || "N/A"}${doc.attachment_number ? `.${doc.attachment_number}` : ""}**`,
    `Type: ${doc.document_type}`,
    `Description: ${doc.description}`,
    `Available: ${doc.is_available ? "Yes" : "No"}`,
    `Free on PACER: ${doc.is_free_on_pacer ? "Yes" : "No"}`,
    `Sealed: ${doc.is_sealed ? "Yes" : "No"}`,
    `Page Count: ${doc.page_count || "Unknown"}`,
    `File Size: ${doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : "Unknown"}`,
    `PACER Doc ID: ${doc.pacer_doc_id || "N/A"}`,
    `OCR Status: ${doc.ocr_status || "N/A"}`,
    `Text Preview: ${textPreview}`,
    `URL: https://www.courtlistener.com${doc.absolute_url}`,
    "---",
  ].join("\\n");
}

// Security utilities - exported for testing
export function sanitizeString(input: string): string {
  // Remove potentially dangerous characters and patterns, and limit length
  return input
    .replace(/[<>\"'&]/g, '') // Remove dangerous HTML/XML characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/password\d*/gi, '[REDACTED]') // Redact password-like strings
    .replace(/secret\d*/gi, '[REDACTED]') // Redact secret-like strings
    .replace(/token\d*/gi, '[REDACTED]') // Redact token-like strings
    .replace(/key\d*/gi, '[REDACTED]') // Redact key-like strings
    .substring(0, 1000);
}

export function validateAndSanitizeParams(params: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'number') {
        sanitized[key] = value.toString();
      } else if (typeof value === 'boolean') {
        sanitized[key] = value.toString();
      }
    }
  });
  
  return sanitized;
}

export function validateApiToken(token?: string): boolean {
  if (!token) return true; // Optional token
  return /^[a-f0-9]{40}$/.test(token);
}

// Normalize API response data to handle edge cases
export function normalizeApiResponse<T>(data: any): T {
  if (data && typeof data === 'object' && data.results && Array.isArray(data.results)) {
    // Handle paginated responses
    if (typeof data.count !== 'number' || isNaN(data.count) || data.count < 0) {
      data.count = data.results.length;
    }
    
    // Ensure next and previous are strings or null
    if (data.next !== null && typeof data.next !== 'string') {
      data.next = null;
    }
    if (data.previous !== null && typeof data.previous !== 'string') {
      data.previous = null;
    }
  }
  
  return data as T;
}

// Rate limiting (simple in-memory implementation)
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = RATE_LIMIT_REQUESTS, windowMs: number = RATE_LIMIT_WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const requestTimes = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    while (requestTimes.length > 0 && requestTimes[0] < windowStart) {
      requestTimes.shift();
    }
    
    if (requestTimes.length >= this.maxRequests) {
      return false;
    }
    
    requestTimes.push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Tool: Search dockets
server.tool(
  "search-dockets",
  "Search for court dockets using various filters",
  {
    q: z.string().max(1000).optional().describe("Search query text"),
    docket_number: z.string().max(100).optional().describe("Specific docket number to search for"),
    court: courtIdSchema.optional().describe("Court ID (e.g., 'scotus', 'ca9', 'nysd')"),
    case_name: z.string().max(500).optional().describe("Case name to search for"),
    date_filed_after: dateSchema.optional().describe("Find cases filed after this date (YYYY-MM-DD)"),
    date_filed_before: dateSchema.optional().describe("Find cases filed before this date (YYYY-MM-DD)"),
    nature_of_suit: z.string().max(200).optional().describe("Nature of suit filter"),
    limit: limitSchema.default(DEFAULT_RESULTS_LIMIT).describe("Number of results to return (max 100)"),
    auth_token: authTokenSchema.describe("CourtListener API authentication token (optional)")
  },
  async ({ q, docket_number, court, case_name, date_filed_after, date_filed_before, nature_of_suit, limit, auth_token }) => {
    const params: Record<string, string> = {};
    
    if (q) params.q = q;
    if (docket_number) params.docket_number = docket_number;
    if (court) params.court = court;
    if (case_name) params.case_name = case_name;
    if (date_filed_after) params.date_filed__gte = date_filed_after;
    if (date_filed_before) params.date_filed__lte = date_filed_before;
    if (nature_of_suit) params.nature_of_suit = nature_of_suit;
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<DocketResponse>>(
      "/dockets/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve dockets data from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No dockets found matching the search criteria",
          },
        ],
      };
    }

    const formattedDockets = data.results.map(formatDocket);
    const docketsText = `Found ${data.count} dockets (showing ${data.results.length}):\\n\\n${formattedDockets.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: docketsText,
        },
      ],
    };
  }
);

// Tool: Get specific docket
server.tool(
  "get-docket",
  "Get detailed information about a specific docket by ID",
  {
    docket_id: z.number().describe("The ID of the docket to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ docket_id, auth_token }) => {
    const data = await makeCourtListenerRequest<DocketResponse>(
      `/dockets/${docket_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve docket ${docket_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedDocket = formatDocket(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Docket Details:\\n\\n${formattedDocket}`,
        },
      ],
    };
  }
);

// Tool: Search opinion clusters
server.tool(
  "search-clusters",
  "Search for opinion clusters (groups of related opinions)",
  {
    q: z.string().optional().describe("Search query text"),
    case_name: z.string().optional().describe("Case name to search for"),
    court: z.string().optional().describe("Court ID (e.g., 'scotus', 'ca9')"),
    date_filed_after: z.string().optional().describe("Find cases filed after this date (YYYY-MM-DD)"),
    date_filed_before: z.string().optional().describe("Find cases filed before this date (YYYY-MM-DD)"),
    precedential_status: z.string().optional().describe("Precedential status (e.g., 'Published', 'Unpublished')"),
    citation: z.string().optional().describe("Citation to search for"),
    limit: z.number().min(1).max(100).default(10).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ q, case_name, court, date_filed_after, date_filed_before, precedential_status, citation, limit, auth_token }) => {
    const params: Record<string, string> = {};
    
    if (q) params.q = q;
    if (case_name) params.case_name = case_name;
    if (court) params.docket__court = court;
    if (date_filed_after) params.date_filed__gte = date_filed_after;
    if (date_filed_before) params.date_filed__lte = date_filed_before;
    if (precedential_status) params.precedential_status = precedential_status;
    if (citation) params.citation = citation;
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<OpinionClusterResponse>>(
      "/clusters/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve clusters data from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No opinion clusters found matching the search criteria",
          },
        ],
      };
    }

    const formattedClusters = data.results.map(formatCluster);
    const clustersText = `Found ${data.count} opinion clusters (showing ${data.results.length}):\\n\\n${formattedClusters.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: clustersText,
        },
      ],
    };
  }
);

// Tool: Get specific cluster
server.tool(
  "get-cluster",
  "Get detailed information about a specific opinion cluster by ID",
  {
    cluster_id: z.number().describe("The ID of the cluster to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ cluster_id, auth_token }) => {
    const data = await makeCourtListenerRequest<OpinionClusterResponse>(
      `/clusters/${cluster_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve cluster ${cluster_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedCluster = formatCluster(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Opinion Cluster Details:\\n\\n${formattedCluster}`,
        },
      ],
    };
  }
);

// Tool: Search opinions
server.tool(
  "search-opinions",
  "Search for individual court opinions",
  {
    q: z.string().optional().describe("Search query text"),
    type: z.string().optional().describe("Opinion type (e.g., 'Lead Opinion', 'Concurrence', 'Dissent')"),
    author: z.string().optional().describe("Author name or ID"),
    court: z.string().optional().describe("Court ID (e.g., 'scotus', 'ca9')"),
    date_created_after: z.string().optional().describe("Find opinions created after this date (YYYY-MM-DD)"),
    date_created_before: z.string().optional().describe("Find opinions created before this date (YYYY-MM-DD)"),
    limit: z.number().min(1).max(100).default(10).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ q, type, author, court, date_created_after, date_created_before, limit, auth_token }) => {
    const params: Record<string, string> = {};
    
    if (q) params.q = q;
    if (type) params.type = type;
    if (author) params.author_str = author;
    if (court) params.cluster__docket__court = court;
    if (date_created_after) params.date_created__gte = date_created_after;
    if (date_created_before) params.date_created__lte = date_created_before;
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<OpinionResponse>>(
      "/opinions/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve opinions data from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No opinions found matching the search criteria",
          },
        ],
      };
    }

    const formattedOpinions = data.results.map(formatOpinion);
    const opinionsText = `Found ${data.count} opinions (showing ${data.results.length}):\\n\\n${formattedOpinions.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: opinionsText,
        },
      ],
    };
  }
);

// Tool: Get specific opinion
server.tool(
  "get-opinion",
  "Get detailed information about a specific opinion by ID",
  {
    opinion_id: z.number().describe("The ID of the opinion to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ opinion_id, auth_token }) => {
    const data = await makeCourtListenerRequest<OpinionResponse>(
      `/opinions/${opinion_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve opinion ${opinion_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedOpinion = formatOpinion(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Opinion Details:\\n\\n${formattedOpinion}`,
        },
      ],
    };
  }
);

// Tool: List courts
server.tool(
  "list-courts",
  "Get a list of available courts",
  {
    jurisdiction: z.string().optional().describe("Filter by jurisdiction (e.g., 'F' for Federal, 'S' for State)"),
    in_use: z.boolean().optional().describe("Filter to only courts currently in use"),
    has_opinion_scraper: z.boolean().optional().describe("Filter to courts with opinion scrapers"),
    limit: z.number().min(1).max(100).default(20).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ jurisdiction, in_use, has_opinion_scraper, limit, auth_token }) => {
    const params: Record<string, string> = {};
    
    if (jurisdiction) params.jurisdiction = jurisdiction;
    if (in_use !== undefined) params.in_use = in_use.toString();
    if (has_opinion_scraper !== undefined) params.has_opinion_scraper = has_opinion_scraper.toString();
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<CourtResponse>>(
      "/courts/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve courts data from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No courts found matching the criteria",
          },
        ],
      };
    }

    const formattedCourts = data.results.map(formatCourt);
    const courtsText = `Found ${data.count} courts (showing ${data.results.length}):\\n\\n${formattedCourts.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: courtsText,
        },
      ],
    };
  }
);

// Tool: Get specific court
server.tool(
  "get-court",
  "Get detailed information about a specific court by ID",
  {
    court_id: z.string().describe("The ID of the court to retrieve (e.g., 'scotus', 'ca9', 'nysd')"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (optional)")
  },
  async ({ court_id, auth_token }) => {
    const data = await makeCourtListenerRequest<CourtResponse>(
      `/courts/${court_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve court ${court_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedCourt = formatCourt(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Court Details:\\n\\n${formattedCourt}`,
        },
      ],
    };
  }
);

// RECAP/PACER Tools

// Tool: Search docket entries
server.tool(
  "search-docket-entries",
  "Search for docket entries within a specific docket",
  {
    docket_id: z.number().describe("The ID of the docket to search entries for"),
    q: z.string().optional().describe("Search query text within docket entries"),
    entry_number: z.number().optional().describe("Specific entry number to search for"),
    date_filed_after: z.string().optional().describe("Find entries filed after this date (YYYY-MM-DD)"),
    date_filed_before: z.string().optional().describe("Find entries filed before this date (YYYY-MM-DD)"),
    description: z.string().optional().describe("Search in entry descriptions"),
    limit: z.number().min(1).max(100).default(20).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ docket_id, q, entry_number, date_filed_after, date_filed_before, description, limit, auth_token }) => {
    const params: Record<string, string> = {
      docket: docket_id.toString(),
    };
    
    if (q) params.q = q;
    if (entry_number) params.entry_number = entry_number.toString();
    if (date_filed_after) params.date_filed__gte = date_filed_after;
    if (date_filed_before) params.date_filed__lte = date_filed_before;
    if (description) params.description__icontains = description;
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<DocketEntryResponse>>(
      "/docket-entries/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve docket entries from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No docket entries found for docket ${docket_id}`,
          },
        ],
      };
    }

    const formattedEntries = data.results.map(formatDocketEntry);
    const entriesText = `Found ${data.count} docket entries for docket ${docket_id} (showing ${data.results.length}):\\n\\n${formattedEntries.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: entriesText,
        },
      ],
    };
  }
);

// Tool: Get specific docket entry
server.tool(
  "get-docket-entry",
  "Get detailed information about a specific docket entry by ID",
  {
    entry_id: z.number().describe("The ID of the docket entry to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ entry_id, auth_token }) => {
    const data = await makeCourtListenerRequest<DocketEntryResponse>(
      `/docket-entries/${entry_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve docket entry ${entry_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedEntry = formatDocketEntry(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Docket Entry Details:\\n\\n${formattedEntry}`,
        },
      ],
    };
  }
);

// Tool: Search parties
server.tool(
  "search-parties",
  "Search for parties within a specific docket",
  {
    docket_id: z.number().describe("The ID of the docket to search parties for"),
    name: z.string().optional().describe("Search for parties by name"),
    party_type: z.string().optional().describe("Filter by party type (e.g., 'Plaintiff', 'Defendant')"),
    limit: z.number().min(1).max(100).default(20).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ docket_id, name, party_type, limit, auth_token }) => {
    const params: Record<string, string> = {
      docket: docket_id.toString(),
    };
    
    if (name) params.name__icontains = name;
    if (party_type) params.party_types__name = party_type;
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<PartyResponse>>(
      "/parties/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve parties from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No parties found for docket ${docket_id}`,
          },
        ],
      };
    }

    const formattedParties = data.results.map(formatParty);
    const partiesText = `Found ${data.count} parties for docket ${docket_id} (showing ${data.results.length}):\\n\\n${formattedParties.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: partiesText,
        },
      ],
    };
  }
);

// Tool: Get specific party
server.tool(
  "get-party",
  "Get detailed information about a specific party by ID",
  {
    party_id: z.number().describe("The ID of the party to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ party_id, auth_token }) => {
    const data = await makeCourtListenerRequest<PartyResponse>(
      `/parties/${party_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve party ${party_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedParty = formatParty(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Party Details:\\n\\n${formattedParty}`,
        },
      ],
    };
  }
);

// Tool: Search attorneys
server.tool(
  "search-attorneys",
  "Search for attorneys within a specific docket",
  {
    docket_id: z.number().describe("The ID of the docket to search attorneys for"),
    name: z.string().optional().describe("Search for attorneys by name"),
    limit: z.number().min(1).max(100).default(20).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ docket_id, name, limit, auth_token }) => {
    const params: Record<string, string> = {
      docket: docket_id.toString(),
    };
    
    if (name) params.name__icontains = name;
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<AttorneyResponse>>(
      "/attorneys/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve attorneys from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No attorneys found for docket ${docket_id}`,
          },
        ],
      };
    }

    const formattedAttorneys = data.results.map(formatAttorney);
    const attorneysText = `Found ${data.count} attorneys for docket ${docket_id} (showing ${data.results.length}):\\n\\n${formattedAttorneys.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: attorneysText,
        },
      ],
    };
  }
);

// Tool: Get specific attorney
server.tool(
  "get-attorney",
  "Get detailed information about a specific attorney by ID",
  {
    attorney_id: z.number().describe("The ID of the attorney to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ attorney_id, auth_token }) => {
    const data = await makeCourtListenerRequest<AttorneyResponse>(
      `/attorneys/${attorney_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve attorney ${attorney_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedAttorney = formatAttorney(data);
    
    return {
      content: [
        {
          type: "text",
          text: `Attorney Details:\\n\\n${formattedAttorney}`,
        },
      ],
    };
  }
);

// Tool: Search RECAP documents
server.tool(
  "search-recap-documents",
  "Search for RECAP documents within a specific docket entry",
  {
    docket_entry_id: z.number().describe("The ID of the docket entry to search documents for"),
    document_type: z.string().optional().describe("Filter by document type"),
    document_number: z.number().optional().describe("Specific document number"),
    is_available: z.boolean().optional().describe("Filter by document availability"),
    is_free_on_pacer: z.boolean().optional().describe("Filter by free availability on PACER"),
    limit: z.number().min(1).max(100).default(20).describe("Number of results to return (max 100)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ docket_entry_id, document_type, document_number, is_available, is_free_on_pacer, limit, auth_token }) => {
    const params: Record<string, string> = {
      docket_entry: docket_entry_id.toString(),
    };
    
    if (document_type) params.document_type = document_type;
    if (document_number) params.document_number = document_number.toString();
    if (is_available !== undefined) params.is_available = is_available.toString();
    if (is_free_on_pacer !== undefined) params.is_free_on_pacer = is_free_on_pacer.toString();
    params.page_size = limit.toString();

    const data = await makeCourtListenerRequest<ApiListResponse<RECAPDocumentResponse>>(
      "/recap-documents/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve RECAP documents from CourtListener API",
          },
        ],
      };
    }

    if (data.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No RECAP documents found for docket entry ${docket_entry_id}`,
          },
        ],
      };
    }

    const formattedDocs = data.results.map(formatRECAPDocument);
    const docsText = `Found ${data.count} RECAP documents for docket entry ${docket_entry_id} (showing ${data.results.length}):\\n\\n${formattedDocs.join("\\n")}`;

    return {
      content: [
        {
          type: "text",
          text: docsText,
        },
      ],
    };
  }
);

// Tool: Get specific RECAP document
server.tool(
  "get-recap-document",
  "Get detailed information about a specific RECAP document by ID",
  {
    document_id: z.number().describe("The ID of the RECAP document to retrieve"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ document_id, auth_token }) => {
    const data = await makeCourtListenerRequest<RECAPDocumentResponse>(
      `/recap-documents/${document_id}/`,
      {},
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve RECAP document ${document_id} from CourtListener API`,
          },
        ],
      };
    }

    const formattedDoc = formatRECAPDocument(data);
    
    return {
      content: [
        {
          type: "text",
          text: `RECAP Document Details:\\n\\n${formattedDoc}`,
        },
      ],
    };
  }
);

// Tool: Fast document lookup (recap-query)
server.tool(
  "recap-query",
  "Fast document lookup by court, case number, and document number",
  {
    court: z.string().describe("Court ID (e.g., 'ca9', 'nysd')"),
    pacer_case_id: z.string().optional().describe("PACER case ID"),
    docket_number: z.string().optional().describe("Docket number (alternative to pacer_case_id)"),
    document_number: z.number().describe("Document number to retrieve"),
    attachment_number: z.number().optional().describe("Attachment number (if looking for attachment)"),
    auth_token: z.string().optional().describe("CourtListener API authentication token (recommended for RECAP data)")
  },
  async ({ court, pacer_case_id, docket_number, document_number, attachment_number, auth_token }) => {
    const params: Record<string, string> = {
      court,
      document_number: document_number.toString(),
    };
    
    if (pacer_case_id) {
      params.pacer_case_id = pacer_case_id;
    } else if (docket_number) {
      params.docket_number = docket_number;
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Error: Either pacer_case_id or docket_number must be provided",
          },
        ],
      };
    }
    
    if (attachment_number) params.attachment_number = attachment_number.toString();

    const data = await makeCourtListenerRequest<RECAPDocumentResponse>(
      "/recap-query/",
      params,
      auth_token
    );

    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve document via recap-query`,
          },
        ],
      };
    }

    const formattedDoc = formatRECAPDocument(data);
    
    return {
      content: [
        {
          type: "text",
          text: `RECAP Document (Fast Lookup):\\n\\n${formattedDoc}`,
        },
      ],
    };
  }
);

// ================================
// ADVANCED LEGAL ANALYSIS TOOLS
// ================================

// Tool: Legal Citation Analysis
server.tool(
  "analyze-citations",
  "Analyze and validate legal citations in text, finding related cases and authorities",
  {
    text: z.string().max(10000).describe("Text containing legal citations to analyze"),
    auth_token: authTokenSchema.describe("CourtListener API authentication token (optional)")
  },
  async ({ text, auth_token }) => {
    try {
      const apiToken = auth_token || process.env.COURTLISTENER_API_TOKEN;

      if (!rateLimiter.isAllowed('citation-analysis')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Rate limit exceeded. Please try again later." }],
        };
      }

      if (!text || text.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "Text is required" }],
        };
      }

      // Extract potential citations using regex patterns
      const citationPatterns = [
        /\d+\s+[A-Z][a-z]*\.?\s*\d+/g, // Simple reporter citations (e.g., "123 F.3d 456")
        /\d+\s+U\.S\.?\s+\d+/g, // U.S. Reports
        /\d+\s+S\.?\s*Ct\.?\s+\d+/g, // Supreme Court Reporter
        /\d+\s+F\.?\s*\d*d?\s+\d+/g, // Federal Reporter series
        /\d+\s+F\.?\s*Supp\.?\s*\d*d?\s+\d+/g, // Federal Supplement
        /[A-Z][a-z]+\s+v\.?\s+[A-Z][a-z]+/g, // Case names
      ];

      const foundCitations = new Set<string>();
      for (const pattern of citationPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach((match: string) => foundCitations.add(match.trim()));
        }
      }

      if (foundCitations.size === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No legal citations found in the provided text.",
            },
          ],
        };
      }

      // Search for related cases for each citation
      const analysisResults = [];
      let searchCount = 0;
      const maxSearches = 5; // Limit to prevent excessive API calls

      for (const citation of Array.from(foundCitations)) {
        if (searchCount >= maxSearches) break;
        
        try {
          // Search for the citation in case names and citations
          const searchQuery = citation.replace(/\s+/g, ' ').trim();
          const searchResults = await makeCourtListenerRequest<ApiListResponse<any>>(
            "/search/",
            { q: searchQuery, type: 'o' },
            apiToken
          );

          analysisResults.push({
            citation,
            found: searchResults?.results?.length ? searchResults.results.length > 0 : false,
            matches: searchResults?.results?.slice(0, 3) || [],
          });
          searchCount++;
        } catch (error) {
          analysisResults.push({
            citation,
            found: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const analysis = analysisResults.map(result => {
        if (result.error) {
          return `• ${result.citation}: Error - ${result.error}`;
        }
        if (!result.found || !result.matches || result.matches.length === 0) {
          return `• ${result.citation}: Not found in CourtListener database`;
        }
        const match = result.matches[0];
        return `• ${result.citation}: Found - ${match.caseName || 'Unknown Case'} (${match.court || 'Unknown Court'})`;
      }).join('\\n');

      return {
        content: [
          {
            type: "text",
            text: `Citation Analysis Results:\\n\\nFound ${foundCitations.size} potential citations:\\n${analysis}\\n\\nNote: This analysis uses pattern matching and may include false positives. Manual verification is recommended.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to analyze citations: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: Case Law Trend Analysis
server.tool(
  "analyze-case-trends",
  "Analyze trends in case law over time for specific legal topics or courts",
  {
    query: z.string().max(500).describe("Legal topic or search query to analyze trends for"),
    court: courtIdSchema.optional().describe("Optional court identifier to limit analysis to"),
    start_date: dateSchema.optional().describe("Start date for trend analysis (YYYY-MM-DD)"),
    end_date: dateSchema.optional().describe("End date for trend analysis (YYYY-MM-DD)"),
    auth_token: authTokenSchema.describe("CourtListener API authentication token (optional)")
  },
  async ({ query, court, start_date, end_date, auth_token }) => {
    try {
      const apiToken = auth_token || process.env.COURTLISTENER_API_TOKEN;

      if (!rateLimiter.isAllowed('trend-analysis')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Rate limit exceeded. Please try again later." }],
        };
      }

      // Build search parameters
      const searchParams = new URLSearchParams({
        q: query,
        type: 'o', // opinions
        order_by: 'dateFiled desc',
      });

      if (court) {
        searchParams.append('court', court);
      }
      if (start_date) {
        searchParams.append('filed_after', start_date);
      }
      if (end_date) {
        searchParams.append('filed_before', end_date);
      }

      // Get larger sample for trend analysis
      const data = await makeCourtListenerRequest<ApiListResponse<any>>(`/search/`, {
        q: query,
        type: 'o',
        order_by: 'dateFiled desc',
        ...(court && { court }),
        ...(start_date && { filed_after: start_date }),
        ...(end_date && { filed_before: end_date }),
        page_size: '50'
      }, apiToken);

      if (!data || !data.results || data.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No cases found for query "${query}" in the specified time range.`,
            },
          ],
        };
      }

      // Analyze trends by year
      const yearlyStats = new Map<string, number>();
      const courtStats = new Map<string, number>();
      
      data.results.forEach((case_: any) => {
        if (case_.dateFiled) {
          const year = case_.dateFiled.substring(0, 4);
          yearlyStats.set(year, (yearlyStats.get(year) || 0) + 1);
        }
        if (case_.court) {
          courtStats.set(case_.court, (courtStats.get(case_.court) || 0) + 1);
        }
      });

      // Format results
      const yearlyTrends = Array.from(yearlyStats.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, count]) => `${year}: ${count} cases`)
        .join('\\n');

      const topCourts = Array.from(courtStats.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([court, count]) => `${court}: ${count} cases`)
        .join('\\n');

      const totalCases = data.results.length;
      const dateRange = start_date && end_date ? `${start_date} to ${end_date}` : 
                       start_date ? `since ${start_date}` :
                       end_date ? `until ${end_date}` : 'all time';

      return {
        content: [
          {
            type: "text",
            text: `Case Law Trend Analysis for "${query}"\\n\\nTime Period: ${dateRange}\\nTotal Cases Found: ${totalCases}\\n\\nYearly Distribution:\\n${yearlyTrends}\\n\\nTop Courts:\\n${topCourts}\\n\\nNote: Analysis based on ${totalCases} most recent cases matching your query. For comprehensive trends, consider using date ranges to get full historical data.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to analyze case trends: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: Judge Analysis
server.tool(
  "analyze-judge",
  "Analyze a judge's judicial record, including opinion patterns and case types",
  {
    judge_name: z.string().max(200).describe("Name of the judge to analyze"),
    court: courtIdSchema.optional().describe("Optional court identifier to limit analysis to"),
    auth_token: authTokenSchema.describe("CourtListener API authentication token (optional)")
  },
  async ({ judge_name, court, auth_token }) => {
    try {
      const apiToken = auth_token || process.env.COURTLISTENER_API_TOKEN;

      if (!rateLimiter.isAllowed('judge-analysis')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Rate limit exceeded. Please try again later." }],
        };
      }

      // Search for opinions by this judge
      const searchParams = new URLSearchParams({
        q: `author:"${judge_name}"`,
        type: 'o',
        order_by: 'dateFiled desc',
      });

      if (court) {
        searchParams.append('court', court);
      }

      const data = await makeCourtListenerRequest<ApiListResponse<any>>("/search/", {
        q: `author:"${judge_name}"`,
        type: 'o',
        order_by: 'dateFiled desc',
        ...(court && { court }),
        page_size: '50'
      }, apiToken);

      if (!data || !data.results || data.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No opinions found for Judge ${judge_name}${court ? ` in court ${court}` : ''}.`,
            },
          ],
        };
      }

      // Analyze judge's record
      const opinionTypes = new Map<string, number>();
      const caseTypes = new Map<string, number>();
      const yearlyOpinions = new Map<string, number>();
      const courts = new Set<string>();

      data.results.forEach((opinion: any) => {
        // Track opinion types
        if (opinion.type) {
          opinionTypes.set(opinion.type, (opinionTypes.get(opinion.type) || 0) + 1);
        }

        // Track case types/nature of suit
        if (opinion.natureOfSuit) {
          caseTypes.set(opinion.natureOfSuit, (caseTypes.get(opinion.natureOfSuit) || 0) + 1);
        }

        // Track yearly activity
        if (opinion.dateFiled) {
          const year = opinion.dateFiled.substring(0, 4);
          yearlyOpinions.set(year, (yearlyOpinions.get(year) || 0) + 1);
        }

        // Track courts
        if (opinion.court) {
          courts.add(opinion.court);
        }
      });

      // Format analysis
      const topOpinionTypes = Array.from(opinionTypes.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => `${type}: ${count}`)
        .join('\\n');

      const topCaseTypes = Array.from(caseTypes.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => `${type}: ${count}`)
        .join('\\n');

      const recentActivity = Array.from(yearlyOpinions.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 5)
        .map(([year, count]) => `${year}: ${count} opinions`)
        .join('\\n');

      const totalOpinions = data.results.length;
      const courtList = Array.from(courts).sort().join(', ');

      return {
        content: [
          {
            type: "text",
            text: `Judicial Record Analysis for ${judge_name}\\n\\nTotal Opinions Found: ${totalOpinions}\\n\\nCourts: ${courtList}\\n\\nOpinion Types:\\n${topOpinionTypes}\\n\\nCase Types:\\n${topCaseTypes}\\n\\nRecent Activity:\\n${recentActivity}\\n\\nNote: Analysis based on ${totalOpinions} most recent opinions. This provides insight into judicial patterns but may not represent the complete judicial record.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to analyze judge: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Tool: Legal Topic Network Analysis
server.tool(
  "analyze-topic-network",
  "Analyze relationships between legal topics by finding cases that cite each other",
  {
    primary_topic: z.string().max(500).describe("Primary legal topic to analyze"),
    related_topics: z.string().max(1000).optional().describe("Comma-separated list of related topics to analyze connections with"),
    court_level: z.enum(["supreme", "appellate", "district", "all"]).default("all").describe("Court level filter"),
    auth_token: authTokenSchema.describe("CourtListener API authentication token (optional)")
  },
  async ({ primary_topic, related_topics, court_level, auth_token }) => {
    try {
      const apiToken = auth_token || process.env.COURTLISTENER_API_TOKEN;

      if (!rateLimiter.isAllowed('topic-network')) {
        return {
          isError: true,
          content: [{ type: "text", text: "Rate limit exceeded. Please try again later." }],
        };
      }

      const relatedTopicsArray = related_topics?.split(',').map(t => t.trim()).filter(t => t.length > 0) || [];

      // Search for cases related to primary topic
      const primarySearchParams = new URLSearchParams({
        q: primary_topic,
        type: 'o',
        order_by: 'citeCount desc',
      });

      // Add court level filter
      if (court_level !== 'all') {
        // This is a simplified court level filter - would need more sophisticated filtering in practice
        if (court_level === 'supreme') {
          primarySearchParams.append('court', 'scotus');
        }
      }

      const primaryData = await makeCourtListenerRequest<ApiListResponse<any>>("/search/", {
        q: primary_topic,
        type: 'o',
        order_by: 'citeCount desc',
        ...(court_level === 'supreme' && { court: 'scotus' }),
        page_size: '20'
      }, apiToken);

      if (!primaryData || !primaryData.results || primaryData.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No cases found for primary topic "${primary_topic}".`,
            },
          ],
        };
      }

      // Analyze connections with related topics
      const topicConnections = new Map<string, number>();
      const caseConnections = [];

      for (const relatedTopic of relatedTopicsArray) {
        const relatedSearchParams = new URLSearchParams({
          q: relatedTopic,
          type: 'o',
        });

        try {
          const relatedData = await makeCourtListenerRequest<ApiListResponse<any>>("/search/", {
            q: relatedTopic,
            type: 'o',
            page_size: '10'
          }, apiToken);
          
          if (relatedData && relatedData.results && relatedData.results.length > 0) {
            topicConnections.set(relatedTopic, relatedData.results.length);
            
            // Find potential connections (simplified - in practice would need citation network analysis)
            const commonCourts = new Set();
            primaryData.results.forEach((primaryCase: any) => {
              relatedData.results!.forEach((relatedCase: any) => {
                if (primaryCase.court === relatedCase.court) {
                  commonCourts.add(primaryCase.court);
                }
              });
            });

            if (commonCourts.size > 0) {
              caseConnections.push({
                topic: relatedTopic,
                commonCourts: Array.from(commonCourts),
                connectionStrength: commonCourts.size
              });
            }
          }
        } catch (error) {
          console.error(`Error searching for related topic ${relatedTopic}:`, error);
        }
      }

      // Format network analysis results
      const primaryCasesSummary = primaryData.results.slice(0, 5).map((case_: any) => 
        `• ${case_.caseName || 'Unknown Case'} (${case_.court || 'Unknown Court'}, ${case_.dateFiled?.substring(0, 4) || 'Unknown Year'})`
      ).join('\\n');

      const topicConnectionsSummary = Array.from(topicConnections.entries())
        .sort(([,a], [,b]) => b - a)
        .map(([topic, count]) => `• ${topic}: ${count} related cases`)
        .join('\\n');

      const networkConnections = caseConnections
        .sort((a, b) => b.connectionStrength - a.connectionStrength)
        .map(conn => `• ${conn.topic}: Connected through ${conn.connectionStrength} courts (${conn.commonCourts.join(', ')})`)
        .join('\\n');

      return {
        content: [
          {
            type: "text",
            text: `Legal Topic Network Analysis\\n\\nPrimary Topic: "${primary_topic}"\\nFound ${primaryData.results.length} related cases\\n\\nTop Cases:\\n${primaryCasesSummary}\\n\\nRelated Topics Analysis:\\n${topicConnectionsSummary}\\n\\nNetwork Connections:\\n${networkConnections || 'No strong connections found between topics'}\\n\\nNote: This is a simplified network analysis. Full citation network analysis would require more sophisticated graph algorithms and comprehensive citation data.`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to analyze topic network: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Start the server when run directly
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CourtListener MCP Server running on stdio");
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Only start the server if this file is being run directly
// Check if we're running this file directly (not importing it)
const isMainModule = process.argv[1] && process.argv[1].endsWith('index.js') || process.argv[1] && process.argv[1].endsWith('index.ts');
if (isMainModule && process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });
}
