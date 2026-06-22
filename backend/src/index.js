// AWS Lambda entrypoint. Wraps the Express app with serverless-http so it can
// be deployed as an Amplify Function behind API Gateway / Lambda Function URL.

const serverless = require('serverless-http');
const app = require('./server');

exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/octet-stream'],
});
