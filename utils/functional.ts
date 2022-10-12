
type Ints = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
type Pred = [never, ...Ints];

type Init<T extends any[]>
    = T extends [infer X, ...infer XS]
        ? [X, ...Init<XS>]
        : [];

type UnRest<T extends any[]>
    = number extends T['length']
        ? Required< Init<T> >
        : Required< T >;

type Last<T extends any[]>
    = T[Pred[T['length']]] extends undefined
        ? unknown
        : T[Pred[T['length']]];

export type Fn = (...args: any[]) => any;

export type CurriedFn = (x: any) => any;

type PartialFn<F extends CurriedFn > = F | (ReturnType<F> extends CurriedFn ? PartialFn< ReturnType<F> > : never);

type Curry<F extends Fn, N extends Ints[number] = Ints[UnRest< Parameters<F> >['length']] >
    = Pred[N] extends never
        ? ReturnType<F>
        : Required< Parameters<F> > extends [infer X, ...infer XS]
            ? (x: X) => Curry< (...xs: XS) => ReturnType<F>, Pred[N] >
            : (x: Last< Parameters<F> >) => Curry< (...xs: Last< Parameters<F> >[] ) => ReturnType<F>, Pred[N] >;

type UnCurry<F extends CurriedFn, D extends Ints[number] = 32>
    = D extends never
        ? Fn
        : F extends (x: any) => CurriedFn
            ? (x: Parameters<F>[0], ...xs: Parameters< UnCurry< ReturnType<F>, Pred[D] > >) => ReturnType< UnCurry< ReturnType<F>, Pred[D] > >
            : (x: Parameters<F>[0]) => ReturnType<F>;

type CurryReturnType<T extends CurriedFn> = ReturnType< UnCurry<T> >;

/**
 * **NOTE:** If the function you pass has any default parameters you MUST pass a second argument with the parameter count!
 * 
 * **REQUIRES COUNT PARAMETER FOR NATIVE OR BUILT-IN FUNCTIONS, THEY CAN HAVE INACCURATE `.length` VALUES**
 */
export const curry = <
        F extends Fn,
        N extends Ints[number] = Ints[UnRest< Parameters<F> >['length']]
    >(f: F, param_count: N = f.length as N): Curry<F, N> => {
        const go = (...xs): PartialFn< Curry<F, N> > => xs.length >= param_count ? f(...xs) : x => go(...xs, x);
        return go() as Curry<F, N>;
    }

export const uncurry = <F extends CurriedFn>(f: F): UnCurry<F> => ((...xs) => xs.reduce($, f)) as UnCurry<F>;

// $ :: (a -> b) -> a -> b
export const $ = <F extends Fn>(f: F, ...xs: Parameters<F>): ReturnType<F> => f(...xs);
export const apply = $;

// (.) :: (b -> c) -> (a -> b) -> (a -> c)
export const compose = <
        A, B, C,
        F extends (x: B) => C
    >(f: F, g: (x: A) => B): ((x: A) => ReturnType<F>) => (x: A) => f(g(x)) as ReturnType<F>;

// flip :: (a -> b -> c) -> (b -> a -> c)
export const flip = <
        F extends CurriedFn,
        A = Parameters<F>[0],
        B = ReturnType<F> extends CurriedFn
            ? Parameters< ReturnType<F> >[0]
            : unknown
    >(f: F) => (b: B) => (a: A):  CurryReturnType<F> => f(a)(b);

export const id = (x: any) => x;

// defer :: (a -> b -> c) -> b -> () -> c
export const defer = /* @__PURE__ */ curry(apply, 3);