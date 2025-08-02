// Polyfill for Promise.allSettled for older React Native versions
if (typeof Promise !== 'undefined' && !Promise.allSettled) {
  Promise.allSettled = function (promises: Promise<any>[]) {
    return Promise.all(
      promises.map(promise =>
        promise
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }))
      )
    );
  };
}

// Ensure Promise.allSettled exists even if the above didn't work
if (typeof Promise !== 'undefined' && typeof Promise.allSettled === 'undefined') {
  (Promise as any).allSettled = function (promises: Promise<any>[]) {
    return Promise.all(
      promises.map(promise =>
        promise
          .then(value => ({ status: 'fulfilled' as const, value }))
          .catch(reason => ({ status: 'rejected' as const, reason }))
      )
    );
  };
}

export {}; 