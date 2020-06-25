import { assert, expect, spy, use } from 'chai'
import spies from 'chai-spies'

import { SubscribablePromise } from '../../../src/utils/SubscribablePromise'

use(spies)

describe('SubscribablePromise', () => {
    it('should work', async () => {
        const subscribable = new SubscribablePromise(() => null)

        assert.isDefined(subscribable)
    })

    describe('#subscribe()', () => {
        it('should return a subscription', async () => {
            const subscribable = new SubscribablePromise(() => null)
            const subscription = subscribable.subscribe(() => null)

            assert.isDefined(subscription)
            assert.isDefined(subscription.unsubscribe)
            assert.typeOf(subscription.unsubscribe, 'function')
        })

        it('should listen the next values', (done) => {
            const onNextSpy = spy()
            const subscribable = new SubscribablePromise((observer) => {
                setTimeout(() => observer.next('test'), 10)
                setTimeout(() => observer.next('test'), 20)
            })
            subscribable.subscribe(onNextSpy)

            setTimeout(() => {
                expect(onNextSpy).to.has.been.called.with('test')
                expect(onNextSpy).to.has.been.called.exactly(2)
                done()
            }, 100)
        })
    })

    describe('#then()', () => {
        it('should resolve', (done) => {
            const onCompleteSpy = spy()
            const onFinallySpy = spy()
            const subscribable = new SubscribablePromise((observer) => {
                setTimeout(() => observer.next('test'), 10)
                setTimeout(() => observer.complete('test'), 20)
            })

            subscribable.then(onCompleteSpy).finally(onFinallySpy)

            setTimeout(() => {
                expect(onCompleteSpy).to.has.been.called.with('test')
                expect(onCompleteSpy).to.has.been.called.exactly(1)
                expect(onFinallySpy).to.has.been.called.exactly(1)
                done()
            }, 100)
        })
    })

    describe('#error()', () => {
        it('should catch the error', (done) => {
            const onErrorSpy = spy()
            const onFinallySpy = spy()
            const subscribable = new SubscribablePromise((observer) => {
                setTimeout(() => observer.next('test'), 10)
                setTimeout(() => observer.error('test'), 20)
            })

            subscribable.catch(onErrorSpy).finally(onFinallySpy)

            setTimeout(() => {
                expect(onErrorSpy).to.has.been.called.with('test')
                expect(onErrorSpy).to.has.been.called.exactly(1)
                expect(onFinallySpy).to.has.been.called.exactly(1)
                done()
            }, 100)
        })
    })

    it('should be able to subscribe and wait for a promise', async () => {
        const onNextSpy = spy()
        const subscribable = new SubscribablePromise((observer) => {
            setTimeout(() => observer.next('test'), 10)
            setTimeout(() => observer.next('test'), 20)
            setTimeout(() => observer.complete('completed'), 30)
        })

        const result = await subscribable.next(onNextSpy)

        expect(onNextSpy).to.has.been.called.with('test')
        expect(onNextSpy).to.has.been.called.exactly(2)

        assert.equal(result, 'completed')
    })

    it('should use the result of a the promise as executor to complete the observer', async () => {
        const onNextSpy = spy()
        const subscribable = new SubscribablePromise(async (observer) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            observer.next('test')
            await new Promise((resolve) => setTimeout(resolve, 10))
            observer.next('test')
            await new Promise((resolve) => setTimeout(resolve, 10))
            return 'completed'
        })

        const result = await subscribable.next(onNextSpy)

        expect(onNextSpy).to.has.been.called.with('test')
        expect(onNextSpy).to.has.been.called.exactly(2)

        assert.equal(result, 'completed')
    })
})
