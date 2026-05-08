/**
 * Controller Stubs
 * Each module has its own controller
 */

// Example structure for all controllers
const createControllerStub = (controllerName) => `
/**
 * ${controllerName} Controller
 */

class ${controllerName}Controller {
  // TODO: Add controller methods
}

module.exports = new ${controllerName}Controller();
`;

module.exports = { createControllerStub };
