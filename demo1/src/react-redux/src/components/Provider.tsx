import type { Context, ReactNode } from 'react'
import { React } from '../utils/react.ts'
import type { Action, Store, UnknownAction } from 'redux'
import type { DevModeCheckFrequency } from '../hooks/useSelector.ts'
import { createSubscription } from '../utils/Subscription.ts'
import { useIsomorphicLayoutEffect } from '../utils/useIsomorphicLayoutEffect.ts'
import type { ReactReduxContextValue } from './Context.ts'
import { ReactReduxContext } from './Context.ts'

export interface ProviderProps<
  A extends Action<string> = UnknownAction,
  S = unknown
> {
  /**
   * The single Redux store in your application.
   */
  store: Store<S, A>

  /**
   * An optional server state snapshot. Will be used during initial hydration render if available, to ensure that the UI output is consistent with the HTML generated on the server.
   */
  serverState?: S

  /**
   * Optional context to be used internally in react-redux. Use React.createContext() to create a context to be used.
   * If this is used, you'll need to customize `connect` by supplying the same context provided to the Provider.
   * Set the initial value to null, and the hooks will error
   * if this is not overwritten by Provider.
   */
  context?: Context<ReactReduxContextValue<S, A> | null>

  /**
   * Determines the frequency of stability checks for all selectors.
   * This setting overrides the global configuration for
   * the `useSelector` stability check, allowing you to specify how often
   * these checks should occur in development mode.
   *
   * @since 8.1.0
   */
  stabilityCheck?: DevModeCheckFrequency

  /**
   * Determines the frequency of identity function checks for all selectors.
   * This setting overrides the global configuration for
   * the `useSelector` identity function check, allowing you to specify how often
   * these checks should occur in development mode.
   *
   * **Note**: Previously referred to as `noopCheck`.
   *
   * @since 9.0.0
   */
  identityFunctionCheck?: DevModeCheckFrequency

  children: ReactNode
}

function Provider<A extends Action<string> = UnknownAction, S = unknown>({
  store,
  context,
  children,
  serverState,
  stabilityCheck = 'once',
  identityFunctionCheck = 'once',
}: ProviderProps<A, S>) {
  const contextValue = React.useMemo(() => {
    const subscription = createSubscription(store)
    return {
      store,
      subscription,
      getServerState: serverState ? () => serverState : undefined,
      stabilityCheck,
      identityFunctionCheck,
    }
  }, [store, serverState, stabilityCheck, identityFunctionCheck])
  // 获取state
  const previousState = React.useMemo(() => store.getState(), [store])
  // 此 hook 一般为 useLayoutEfect
  useIsomorphicLayoutEffect(() => {
    console.log('react-redux', 'provider', 'useIsomorphicLayoutEffect')
    const { subscription } = contextValue
    subscription.onStateChange = subscription.notifyNestedSubs
    subscription.trySubscribe()

    if (previousState !== store.getState()) {
      console.log(
        'react-redux',
        'provider',
        'useIsomorphicLayoutEffect',
        'state change'
      )

      // 触发一个subscription的更行事件
      subscription.notifyNestedSubs()
    }
    return () => {
      subscription.tryUnsubscribe()
      subscription.onStateChange = undefined
    }
  }, [contextValue, previousState])

  const Context = context || ReactReduxContext

  // @ts-ignore 'AnyAction' is assignable to the constraint of type 'A', but 'A' could be instantiated with a different subtype
  return <Context.Provider value={contextValue}>{children}</Context.Provider>
}

export default Provider
