import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renameAppName,
  renameComposeProject,
  renamePackage,
  renameReadmeTitle,
  toTitle,
  validateProjectName,
} from "./rename.mjs";

const packageJson = `{
  "name": "fullstack-starter",
  "private": true,
  "dependencies": {
    "name": "not-me"
  }
}
`;

const compose = `# Full stack
name: fullstack-starter

services:
  postgres:
    image: postgres:18-alpine
`;

const appConfig = `const name = import.meta.env.VITE_APP_NAME?.trim() || "Fullstack Starter";\n`;

describe("validateProjectName", () => {
  it("accepts kebab-case names", () => {
    assert.doesNotThrow(() => validateProjectName("acme-crm2"));
  });

  it("rejects names Docker Compose or npm would refuse", () => {
    for (const name of ["", "Acme", "acme crm", "acme_crm", "-acme", "acme-", "@acme/crm"]) {
      assert.throws(() => validateProjectName(name), /kebab-case/, name);
    }
  });
});

describe("toTitle", () => {
  it("capitalizes each word", () => {
    assert.equal(toTitle("acme-crm"), "Acme Crm");
  });
});

describe("renamePackage", () => {
  it("renames only the root package name", () => {
    const renamed = renamePackage(packageJson, "acme-crm");
    assert.equal(JSON.parse(renamed).name, "acme-crm");
    assert.equal(JSON.parse(renamed).dependencies.name, "not-me");
    assert.equal(renamed, packageJson.replace('"fullstack-starter"', '"acme-crm"'));
  });
});

describe("renameComposeProject", () => {
  it("sets the top-level project name and keeps the rest", () => {
    assert.equal(
      renameComposeProject(compose, "acme-crm"),
      compose.replace("name: fullstack-starter", "name: acme-crm"),
    );
  });

  it("supports a suffix for the development stack", () => {
    assert.match(
      renameComposeProject(compose.replace("starter", "starter-dev"), "acme-crm-dev"),
      /^name: acme-crm-dev$/m,
    );
  });
});

describe("renameAppName", () => {
  it("replaces the default app name and escapes quotes", () => {
    assert.equal(
      renameAppName(appConfig, 'Acme "CRM"'),
      'const name = import.meta.env.VITE_APP_NAME?.trim() || "Acme \\"CRM\\"";\n',
    );
  });
});

describe("renameReadmeTitle", () => {
  it("replaces the first level-one heading only", () => {
    assert.equal(
      renameReadmeTitle("# Fullstack Starter\n\nText\n\n# Other\n", "Acme Crm"),
      "# Acme Crm\n\nText\n\n# Other\n",
    );
  });
});

describe("idempotency", () => {
  it("returns the same content when applied twice", () => {
    const once = {
      pkg: renamePackage(packageJson, "acme-crm"),
      compose: renameComposeProject(compose, "acme-crm"),
      config: renameAppName(appConfig, "Acme Crm"),
      readme: renameReadmeTitle("# Fullstack Starter\n", "Acme Crm"),
    };
    assert.equal(renamePackage(once.pkg, "acme-crm"), once.pkg);
    assert.equal(renameComposeProject(once.compose, "acme-crm"), once.compose);
    assert.equal(renameAppName(once.config, "Acme Crm"), once.config);
    assert.equal(renameReadmeTitle(once.readme, "Acme Crm"), once.readme);
  });

  it("reports a missing anchor instead of silently doing nothing", () => {
    assert.throws(() => renameComposeProject("services: {}\n", "acme-crm"), /name:/);
    assert.throws(() => renameAppName("export {};\n", "Acme"), /VITE_APP_NAME/);
  });
});
