const fs = require('fs');
const http = require('http');
const mime = require('mime');
const path = require('path');
const url = require('url');
const zlib = require('zlib');

function getDefaultParts() {
	return {status: 500, headers: {}, content: ''};
}

function handleResponse(request, response, parts) {
	parts.headers['Content-Length'] = parts.content.length;
	parts.headers['Connection'] = 'close';

	let acceptencoding = request.headers['accept-encoding'];
	if (acceptencoding == null) {
		acceptencoding = '';
	}
	if (acceptencoding.indexOf('gzip') !== -1) {
		zlib.gzip(parts.content, function(error, buffer) {
			if (!error) {
				parts.headers['Content-Encoding'] = 'gzip';
				response.writeHead(parts.status, parts.headers);
				response.end(buffer, 'binary');
			} else {
				response.writeHead(parts.status, parts.headers);
				response.end(parts.content);
			}
			console.log(`Status: ${ parts.status }`);
			console.log(`Headers: ${ JSON.stringify(parts.headers) }`);
		});
	} else {
		response.writeHead(parts.status, parts.headers);
		response.end(parts.content);
		console.log(`Status: ${ parts.status }`);
		console.log(`Headers: ${ JSON.stringify(parts.headers) }`);
	}
}

function handleFile(request, response, filename, content) {
	let parts = getDefaultParts();
	parts.status = 200;
	parts.headers = {'Content-Type': `${ mime.getType(filename) }; charset=utf-8`};
	parts.content = content;
	handleResponse(request, response, parts);
}

function handleError(request, response, error) {
	let parts = getDefaultParts();
	parts.status = error;
	parts.headers = { 'Content-Type': 'text/plain; charset=utf-8' };
	parts.content = 'ERROR: ' + error;
	handleResponse(request, response, parts);
}

const port = 8000;
const rootdirectory = 'root';
const defaultfilename = 'index.html';
const server = http.createServer(function(request, response) {
	console.log('\n');
	console.log('--REQUEST--');
	console.log(`${ request.method } ${ request.url } HTTP/${ request.httpVersion }`);
	console.log(JSON.stringify(request.headers));

	console.log('--RESPONSE--');
	const urlparts = url.parse(request.url, true);
	let filename = path.join(__dirname, rootdirectory, urlparts.pathname);
	if (filename.charAt(filename.length - 1) === '/') {
		filename += defaultfilename;
	}
	fs.readFile(filename, function(error, content) {
		if (!error) {
			handleFile(request, response, filename, content);
		} else {
			handleError(request, response, 404);
		}
	});
}).listen(port);

console.log(`Simple static webserver running at http://127.0.0.1:${ server.address().port }/`);
console.log(`ROOT DIRECTORY: ${ path.join(__dirname, rootdirectory) }`);
