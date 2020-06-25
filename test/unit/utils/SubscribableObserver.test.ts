import { assert, expect, spy, use } from 'chai'
import spies from 'chai-spies'

import { SubscribableObserver } from '../../../src/utils/SubscribableObserver'

use(spies)

describe('SubscribableObserver', () => {
    describe('#subscribe()', () => {
        it('should be able to add a subcription', async () => {
            const observer = new SubscribableObserver()
            const subscription = observer.subscribe()

            assert.isDefined(subscription.unsubscribe)
            assert.typeOf(subscription.unsubscribe, 'function')
        })

        it('should be able to unsubscribe', async () => {
            const observer = new SubscribableObserver()
            const subscription = observer.subscribe()

            subscription.unsubscribe()
        })
    })

    describe('#next()', () => {
        it('should be able to emit next value', async () => {
            const onNextSpy = spy()
            const observer = new SubscribableObserver()
            observer.subscribe(onNextSpy)

            observer.next('test')
            expect(onNextSpy).to.has.been.called.with('test')

            observer.next('test')
            expect(onNextSpy).to.has.been.called.exactly(2)
        })
    })

    describe('#complete()', () => {
        it('should be able to complete', async () => {
            const onCompleteSpy = spy()
            const observer = new SubscribableObserver()
            observer.subscribe(undefined, onCompleteSpy)

            observer.complete('test')
            expect(onCompleteSpy).to.has.been.called.with('test')

            observer.complete('test')
            expect(onCompleteSpy).to.has.been.called.exactly(1)

            assert.isTrue(observer.completed)
        })
    })

    describe('#error()', () => {
        it('should be able to emit a error', async () => {
            const onErrorSpy = spy()
            const observer = new SubscribableObserver()
            observer.subscribe(undefined, undefined, onErrorSpy)

            observer.error('test')
            expect(onErrorSpy).to.has.been.called.with('test')

            observer.error('test')
            expect(onErrorSpy).to.has.been.called.exactly(1)

            assert.isTrue(observer.completed)
        })
    })
})
