# RECAP/PACER Tools Reference

This document provides detailed information about the RECAP/PACER tools that have been added to the CourtListener MCP Server.

## Overview

RECAP (REsource for Court Access) provides access to federal court dockets, documents, and case information from PACER (Public Access to Court Electronic Records). These tools allow you to search and retrieve detailed information about federal court proceedings.

## Tools

### Docket Entries

#### `search-docket-entries`
Search for docket entries within a specific docket.

**Parameters:**
- `docket_id` (required): The ID of the docket to search entries for
- `q` (optional): Search query text within docket entries
- `entry_number` (optional): Specific entry number to search for
- `date_filed_after` (optional): Find entries filed after this date (YYYY-MM-DD)
- `date_filed_before` (optional): Find entries filed before this date (YYYY-MM-DD)
- `description` (optional): Search in entry descriptions
- `limit` (optional): Number of results to return (default: 20, max: 100)
- `auth_token` (optional): CourtListener API authentication token (recommended)

#### `get-docket-entry`
Get detailed information about a specific docket entry by ID.

**Parameters:**
- `entry_id` (required): The ID of the docket entry to retrieve
- `auth_token` (optional): CourtListener API authentication token (recommended)

### Parties

#### `search-parties`
Search for parties within a specific docket.

**Parameters:**
- `docket_id` (required): The ID of the docket to search parties for
- `name` (optional): Search for parties by name
- `party_type` (optional): Filter by party type (e.g., 'Plaintiff', 'Defendant')
- `limit` (optional): Number of results to return (default: 20, max: 100)
- `auth_token` (optional): CourtListener API authentication token (recommended)

#### `get-party`
Get detailed information about a specific party by ID.

**Parameters:**
- `party_id` (required): The ID of the party to retrieve
- `auth_token` (optional): CourtListener API authentication token (recommended)

### Attorneys

#### `search-attorneys`
Search for attorneys within a specific docket.

**Parameters:**
- `docket_id` (required): The ID of the docket to search attorneys for
- `name` (optional): Search for attorneys by name
- `limit` (optional): Number of results to return (default: 20, max: 100)
- `auth_token` (optional): CourtListener API authentication token (recommended)

#### `get-attorney`
Get detailed information about a specific attorney by ID.

**Parameters:**
- `attorney_id` (required): The ID of the attorney to retrieve
- `auth_token` (optional): CourtListener API authentication token (recommended)

### RECAP Documents

#### `search-recap-documents`
Search for RECAP documents within a specific docket entry.

**Parameters:**
- `docket_entry_id` (required): The ID of the docket entry to search documents for
- `document_type` (optional): Filter by document type
- `document_number` (optional): Specific document number
- `is_available` (optional): Filter by document availability
- `is_free_on_pacer` (optional): Filter by free availability on PACER
- `limit` (optional): Number of results to return (default: 20, max: 100)
- `auth_token` (optional): CourtListener API authentication token (recommended)

#### `get-recap-document`
Get detailed information about a specific RECAP document by ID.

**Parameters:**
- `document_id` (required): The ID of the RECAP document to retrieve
- `auth_token` (optional): CourtListener API authentication token (recommended)

#### `recap-query`
Fast document lookup by court, case number, and document number.

**Parameters:**
- `court` (required): Court ID (e.g., 'ca9', 'nysd')
- `pacer_case_id` (optional): PACER case ID
- `docket_number` (optional): Docket number (alternative to pacer_case_id)
- `document_number` (required): Document number to retrieve
- `attachment_number` (optional): Attachment number (if looking for attachment)
- `auth_token` (optional): CourtListener API authentication token (recommended)

**Note:** Either `pacer_case_id` or `docket_number` must be provided.

## Usage Examples

### Finding All Docket Entries for a Case
```
Use search-docket-entries with:
- docket_id: 12345
- limit: 50
```

### Searching for Motions in a Case
```
Use search-docket-entries with:
- docket_id: 12345
- description: "motion"
```

### Finding Corporate Parties
```
Use search-parties with:
- docket_id: 12345
- name: "Corporation"
- party_type: "Defendant"
```

### Getting a Specific Document
```
Use recap-query with:
- court: "nysd"
- docket_number: "1:20-cv-12345"
- document_number: 1
```

### Finding Available Documents in a Docket Entry
```
Use search-recap-documents with:
- docket_entry_id: 67890
- is_available: true
- is_free_on_pacer: true
```

## Authentication

While these tools can work without authentication, using a CourtListener API token is **strongly recommended** for RECAP/PACER data as it provides:
- Better access to federal court documents
- Higher rate limits
- More comprehensive data

Get an API token from: https://www.courtlistener.com/api/

## Common Court IDs

- `nysd` - Southern District of New York
- `cand` - Northern District of California
- `dcd` - District of Columbia
- `txsd` - Southern District of Texas
- `ca9` - Ninth Circuit Court of Appeals
- `ca2` - Second Circuit Court of Appeals

For a complete list, use the `list-courts` tool with `jurisdiction: "F"` for federal courts.
