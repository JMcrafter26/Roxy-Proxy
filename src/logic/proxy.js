import { cleanResponseHeaders, createProxyUrl, handleRequest, matchesContentType } from '../utils/helpers.js';
import { CORS_HEADERS, USER_AGENTS, CONTENT_TYPES, HTTP_STATUS } from '../utils/constants.js';

/**
 * Process M3U8 content by replacing URLs with proxied versions
 * @param {string} content - The M3U8 content
 * @param {string} mediaUrl - Base media URL
 * @param {string} origin - Origin URL
 * @param {Object} headers - Headers to include in proxy URLs
 * @returns {string} - Processed M3U8 content
 */
function processM3U8Content(content, mediaUrl, origin, headers) {
	return content
		.split('\n')
		.map((line) => {
			// Handle URI attributes in tags
			const uriMatch = line.match(/(URI=)(["'])(?<uri>.*?)\2/);
			if (uriMatch) {
				try {
					const [fullMatch, prefix, quote] = uriMatch;
					const resolvedUrl = new URL(uriMatch.groups.uri, mediaUrl).toString();
					const proxyUrl = createProxyUrl(resolvedUrl, origin, headers);
					return line.replace(fullMatch, `${prefix}${quote}${proxyUrl}${quote}`);
				} catch (error) {
					console.error('Error processing URI:', uriMatch.groups.uri, error);
					return line;
				}
			}

			// Pass through stream information lines
			if (line.startsWith('#EXT-X-STREAM-INF')) {
				return line;
			}

			// Handle content URLs
			if (!line.startsWith('#') && line.trim()) {
				try {
					const resolvedUrl = new URL(line.trim(), mediaUrl).toString();
					return createProxyUrl(resolvedUrl, origin, headers);
				} catch (error) {
					console.error('Error processing URL:', line.trim(), error);
					return line;
				}
			}

			return line;
		})
		.join('\n');
}

/**
 * Handle OPTIONS request for CORS preflight
 * @returns {Response} - CORS preflight response
 */
function handleOptionsRequest() {
	return new Response(null, {
		status: HTTP_STATUS.NO_CONTENT,
		headers: CORS_HEADERS,
	});
}

/**
 * Main proxy request handler
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} - Proxied response
 */
async function proxy(request) {
	if (request.method === 'OPTIONS') {
		return handleOptionsRequest();
	}

	try {
		const [mediaUrl, decodedHeaders, origin] = handleRequest(request);
		const rangeHeader = request.headers.get('Range');

		const fetchHeaders = {
			'User-Agent': USER_AGENTS.FIREFOX,
			Connection: 'keep-alive',
			...decodedHeaders,
			...(rangeHeader && { Range: rangeHeader }),
		};

		const response = await fetch(mediaUrl, { headers: fetchHeaders });
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const cleanHeaders = cleanResponseHeaders(response.headers);
		const responseHeaders = {
			...cleanHeaders,
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Expose-Headers': Object.keys(cleanHeaders).join(', '),
		};

		const contentType = response.headers.get('Content-Type') || '';

		// Check for M3U8 content type first (before binary check)
		// This is important because some M3U8 types like 'audio/mpegurl' contain 'audio/'
		// which would incorrectly match the BINARY pattern
		const isM3U8ContentType = matchesContentType(contentType, CONTENT_TYPES.M3U8);

		// Direct stream for video, audio, and other binary content
		// But NOT if it's an M3U8 file
		if (!isM3U8ContentType && matchesContentType(contentType, CONTENT_TYPES.BINARY)) {
			return new Response(response.body, {
				status: response.status,
				headers: responseHeaders,
			});
		}

		// For M3U8 and text content
		const responseContent = await response.text();
		const contentLooksLikeM3U8 = responseContent.trimStart().startsWith('#EXTM3U');
		const isM3U8 = contentLooksLikeM3U8 || isM3U8ContentType;

		if (isM3U8) {
			responseHeaders['Content-Type'] = CONTENT_TYPES.M3U8[0];
			return new Response(processM3U8Content(responseContent, mediaUrl, origin, decodedHeaders), {
				status: response.status,
				headers: responseHeaders,
			});
		}

		return new Response(responseContent, {
			status: response.status,
			headers: responseHeaders,
		});
	} catch (error) {
		console.error('Error in proxy:', error);
		return new Response(`Proxy error: ${error.message}`, {
			status: HTTP_STATUS.SERVER_ERROR,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'text/plain',
			},
		});
	}
}

export default proxy;
