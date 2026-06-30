import assert from "node:assert/strict";
import test from "node:test";

import { handleCloseRequested, injectVersion } from "../src/ui/titlebar.js";

test("version is injected into every version tag", () => {
  const tags = [{ textContent: "" }, { textContent: "" }];
  injectVersion(
    { querySelectorAll: (selector) => (selector === ".version-tag" ? tags : []) },
    "v1.0.0-test"
  );

  assert.deepEqual(tags.map(({ textContent }) => textContent), [
    "v1.0.0-test",
    "v1.0.0-test",
  ]);
});

test("close request is blocked when unsaved changes are not confirmed", async () => {
  let prevented = false;
  const result = await handleCloseRequested(
    { preventDefault: () => (prevented = true) },
    {
      shouldConfirmClose: () => true,
      confirmClose: () => false,
    }
  );

  assert.equal(result, false);
  assert.equal(prevented, true);
});

test("clean or confirmed close requests are allowed", async () => {
  let confirmationCount = 0;
  const cleanResult = await handleCloseRequested(
    { preventDefault: () => assert.fail("clean close was blocked") },
    {
      shouldConfirmClose: () => false,
      confirmClose: () => {
        confirmationCount += 1;
        return false;
      },
    }
  );
  const confirmedResult = await handleCloseRequested(
    { preventDefault: () => assert.fail("confirmed close was blocked") },
    {
      shouldConfirmClose: () => true,
      confirmClose: () => true,
    }
  );

  assert.equal(cleanResult, true);
  assert.equal(confirmedResult, true);
  assert.equal(confirmationCount, 0);
});
