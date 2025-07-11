<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# CourtListener MCP Server

This is a Model Context Protocol (MCP) server for the CourtListener API. You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

## Project Overview

This MCP server provides tools to interact with the CourtListener API (https://www.courtlistener.com/help/api/rest/case-law/), which contains a comprehensive database of US court cases, opinions, dockets, and court information.

## Available Tools

### Case Law Tools
- **search-dockets**: Search for court dockets using various filters
- **get-docket**: Get detailed information about a specific docket by ID
- **search-clusters**: Search for opinion clusters (groups of related opinions)
- **get-cluster**: Get detailed information about a specific opinion cluster by ID
- **search-opinions**: Search for individual court opinions
- **get-opinion**: Get detailed information about a specific opinion by ID
- **list-courts**: Get a list of available courts
- **get-court**: Get detailed information about a specific court by ID

### RECAP/PACER Tools
- **search-docket-entries**: Search for docket entries within a specific docket
- **get-docket-entry**: Get detailed information about a specific docket entry by ID
- **search-parties**: Search for parties within a specific docket
- **get-party**: Get detailed information about a specific party by ID
- **search-attorneys**: Search for attorneys within a specific docket
- **get-attorney**: Get detailed information about a specific attorney by ID
- **search-recap-documents**: Search for RECAP documents within a specific docket entry
- **get-recap-document**: Get detailed information about a specific RECAP document by ID
- **recap-query**: Fast document lookup by court, case number, and document number

## Key Features

- Support for authenticated and unauthenticated requests
- Comprehensive search capabilities across dockets, opinions, clusters, and courts
- Formatted output for easy reading
- Rate limiting and error handling
- TypeScript implementation with proper type definitions

## Usage Guidelines

When working with this codebase:

1. Follow TypeScript best practices and maintain type safety
2. Use the existing API response interfaces for consistency
3. Handle errors gracefully and provide meaningful error messages
4. Keep formatting functions consistent with the current style
5. Respect the CourtListener API rate limits
6. Document any new tools or features added

## API Reference

Refer to the CourtListener API documentation: https://www.courtlistener.com/help/api/rest/case-law/
