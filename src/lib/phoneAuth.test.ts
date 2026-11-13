import assert from 'node:assert/strict';
import {
  RecaptchaLifecycleManager,
  validateIndianMobile,
  isRecoverableRecaptchaError,
  mapPhoneAuthError,
} from './phoneAuth';

interface FakeElement {
  id: string;
  children: FakeElement[];
  ownerDocument: FakeDocument;
  appendChild: (child: FakeElement) => FakeElement;
  replaceChildren: (...nodes: FakeElement[]) => void;
  remove: () => void;
}

interface FakeDocument {
  createElement: (tag: string) => FakeElement;
}

function createFakeDom(): { hostEl: FakeElement; doc: FakeDocument } {
  const makeEl = (doc: FakeDocument): FakeElement => {
    const el: FakeElement = {
      id: '',
      children: [],
      ownerDocument: doc,
      appendChild(child: FakeElement) {
        this.children.push(child);
        return child;
      },
      replaceChildren(...nodes: FakeElement[]) {
        this.children = [...nodes];
      },
      remove() {
        // Detached from parent in test simulation
      },
    };
    return el;
  };

  const doc: FakeDocument = {
    createElement: () => makeEl(doc),
  };

  const hostEl = makeEl(doc);
  hostEl.id = 'vizag-recaptcha-test';
  return { hostEl, doc };
}

async function runTests() {
  // 1. Test reCAPTCHA initialization & duplicate prevention (including concurrent calls)
  {
    const { hostEl } = createFakeDom();
    const renderedElements = new Set<HTMLElement>();
    let createCount = 0;
    let clearCount = 0;

    const manager = new RecaptchaLifecycleManager((container) => {
      if (renderedElements.has(container)) {
        throw new Error('reCAPTCHA has already been rendered in this element.');
      }
      renderedElements.add(container);
      createCount += 1;
      return {
        render: async () => 1,
        clear: () => {
          clearCount += 1;
        },
      };
    });

    const [v1, v2, v3] = await Promise.all([
      manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r1'),
      manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r1'),
      manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r1'),
    ]);

    assert.equal(createCount, 1, 'Concurrent ensureVerifier calls must create only 1 verifier');
    assert.strictEqual(v1, v2);
    assert.strictEqual(v2, v3);
    assert.equal(hostEl.children.length, 1);
    assert.equal(hostEl.children[0].id, 'vizag-recaptcha-r1-slot-1');

    // Sequential reuse (e.g. Resend OTP)
    const v4 = await manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r1');
    assert.strictEqual(v4, v1, 'Verifier should be reused when still healthy');
    assert.equal(createCount, 1);

    // 2. Test reset & recreation on a fresh DOM slot (never reusing previously rendered DOM element)
    manager.reset();
    assert.equal(clearCount, 1, 'reset() must call clear() on active verifier');
    assert.equal(hostEl.children.length, 0, 'reset() must clear host DOM children');

    const v5 = await manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r1');
    assert.notStrictEqual(v5, v1, 'After reset, a new verifier should be created');
    assert.equal(createCount, 2);
    assert.equal(hostEl.children[0].id, 'vizag-recaptcha-r1-slot-2');
    manager.destroy();
  }

  // 3. Test reCAPTCHA expiration & error callbacks trigger clean reset
  {
    const { hostEl } = createFakeDom();
    let expiredFired = false;
    let errorFired = false;
    let capturedParams: { 'expired-callback'?: () => void; 'error-callback'?: () => void } = {};

    const manager = new RecaptchaLifecycleManager((_container, params) => {
      capturedParams = params as typeof capturedParams;
      return {
        render: async () => 2,
        clear: () => {},
      };
    });

    await manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r2', {
      onExpired: () => {
        expiredFired = true;
      },
      onError: () => {
        errorFired = true;
      },
    });
    assert.equal(manager.hasActiveVerifier(), true);

    capturedParams['expired-callback']?.();
    assert.equal(expiredFired, true, 'onExpired callback must run');
    assert.equal(manager.hasActiveVerifier(), false, 'Verifier must reset on expiration');

    await manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r2', {
      onExpired: () => {
        expiredFired = true;
      },
      onError: () => {
        errorFired = true;
      },
    });
    capturedParams['error-callback']?.();
    assert.equal(errorFired, true, 'onError callback must run');
    assert.equal(manager.hasActiveVerifier(), false, 'Verifier must reset on error');
  }

  // 4. Test async unmount / destroy abort clears verifier without leak
  {
    const { hostEl } = createFakeDom();
    let clearedOnAbort = false;
    let resolveRender!: (val: number) => void;

    const manager = new RecaptchaLifecycleManager(() => ({
      render: () =>
        new Promise<number>((res) => {
          resolveRender = res;
        }),
      clear: () => {
        clearedOnAbort = true;
      },
    }));

    const pending = manager.ensureVerifier(hostEl as unknown as HTMLElement, 'vizag-recaptcha-r3');
    manager.destroy();
    resolveRender(99);

    await assert.rejects(pending, /RECAPTCHA_LIFECYCLE_ABORTED/);
    assert.equal(clearedOnAbort, true, 'Aborted async render must clear verifier cleanly');
    assert.equal(hostEl.children.length, 0);
  }

  // 5. Test Send OTP validation, Expired OTP error mapping & recoverable reCAPTCHA detection
  {
    assert.equal(validateIndianMobile('9848012345'), null);
    assert.notEqual(validateIndianMobile('12345'), null);
    assert.equal(
      isRecoverableRecaptchaError(new Error('reCAPTCHA has already been rendered in this element.')),
      true
    );
    assert.equal(isRecoverableRecaptchaError({ code: 'auth/captcha-check-failed' }), true);
    assert.match(
      mapPhoneAuthError({ code: 'auth/code-expired' }),
      /expired/i
    );
    assert.match(
      mapPhoneAuthError({ code: 'auth/invalid-verification-code' }),
      /Incorrect 6-digit OTP/i
    );
  }

  console.log('ALL_PHONE_AUTH_RECAPTCHA_TESTS_PASSED');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
