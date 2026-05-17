const swaggerJSDoc = require('swagger-jsdoc');
const pkg = require('../../package.json');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: pkg.name || 'Ludo Game Backend API',
      version: pkg.version || '1.0.0',
      description: pkg.description || 'API documentation',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
