export class SubscribableObserver<T, P> {
  public completed = false

  private subscriptions = new Set<{
    onNext?: (next: T) => void
    onComplete?: (complete: P) => void
    onError?: (error: any) => void
  }>()

  public subscribe(
    onNext?: (next: T) => void,
    onComplete?: (complete: P) => void,
    onError?: (error: any) => void
  ) {
    if (this.completed) {
      throw new Error('Observer completed.')
    }
    const subscription = { onNext, onComplete, onError }
    this.subscriptions.add(subscription)

    return {
      unsubscribe: () => this.subscriptions.delete(subscription)
    }
  }

  public next(next?: T): void {
    this.emit('onNext', next)
  }

  public complete(resolve?: P): void {
    this.emit('onComplete', resolve)
    this.unsubscribe()
  }

  public error(error?: any): void {
    this.emit('onError', error)
    this.unsubscribe()
  }

  private emit(type: 'onNext' | 'onComplete' | 'onError', value: any) {
    Array.from(this.subscriptions)
      .map((subscription) => subscription[type])
      .filter((callback: any) => callback && typeof callback === 'function')
      .forEach((callback: any) => callback(value))
  }

  private unsubscribe() {
    this.completed = true
    this.subscriptions.clear()
  }
}
