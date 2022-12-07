
import type { Fiber } from 'react-reconciler';

import { walkTree, findKey } from 'utils/utils';

import { React, ReactDOM } from 'utils/BdApi';

type Component = React.FunctionComponent | React.ComponentClass;

export const getRenderedChildType = (c: Component, f: (c: any) => boolean, props = {}): Component | false => {
    // Create a temporary root to render our parent component in.
    const root = document.createElement('div') as (HTMLDivElement & { __reactContainer$: Fiber });

    // Create an instance of the component and render it in our root.
    ReactDOM.render(React.createElement(c, props), root);

    // Grab the internal fiber from the root;
    const fiber = root[findKey(root, k => k.startsWith('__reactContainer$'))];

    // Walk the tree from the fiber until we find a type matching our filter `f`
    const result = walkTree(fiber, e => e.type && (typeof e.type !== 'string') && f(e.type));

    // ! Clean up the React DOM now that we have what we need ! //
    ReactDOM.unmountComponentAtNode(root);

    return result && result.type;
}