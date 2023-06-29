---
title: Using custom Svelte stores
publishedAt: March 2023
description: Need some content to repeat across the screen and endlessly loop round and round? In this blog post, I take a look at how to create an infinite looper with React JS and CSS animations.
canonical: https://blog.finiam.com/blog/using-custom-svelte-stores
---

# Using custom Svelte stores

_This was originally written for [Finiam](https://blog.finiam.com/blog/using-custom-svelte-stores)_

With Svelte, we get an out of the box solution for state management - stores. According to the [docs](https://svelte.dev/docs#run-time-svelte-store), a store is any object with a subscribe, unsubscribe, and (optionally) a set method. Svelte provides the functions to easily create readable, writable, or derived stores. 

At it's most simple:

```typescript
const simplePizza = writable({
  ingredients: [],
  ovenTime: 0,
  status: 'idle',
});

export default simplePizza;
```

Then we could use it like this in a component:

```html
<script lang="ts">
  import simplePizza from "../stores/simplePizza"

  let inputVal: string;

  function handleSubmit() {
    simplePizza.update(st => ({
      ...st,
      ingredients: [...st.ingredients, inputVal]
    }))
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input name="ingredient" bind:value={inputVal} />
  <button type="submit">Add</button>
</form>
<ul>
{#each $simplePizza.ingredients as ingredient}
  <li>{ingredient}</li>
{/each}
</ul>
```
By using the dollar sign to access the store, we're subscribing to updates in the store's value, and our component will react to any change and show the updated ingredient list (you can [check the docs on the dollar sign syntax here](https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values), but it basically uses the store's `subscribe` function, and unsubscribes when appropriate). Outside of components, we can manually subscribe:

```typescript
const unsubscribe = simplePizza.subscribe((value) => {
    // do something when there are changes
});

unsubscribe()
```

If you've used Svelte before, you probably already know this. What about custom stores?

## Custom stores

In many cases, we're likely to need some logic around the store. For instance, we may want to control how the store is updated, without having that validation in components. This is where custom stores come in handy:

```typescript
//customPizza.ts
type PizzaStore = {
  ingredients: string[];
  ovenTime: number;
  status: 'idle' | 'preparing' | 'baking' | 'ready';
};

function createPizzaStore() {
  const { set, update, subscribe } = writable<PizzaStore>({
    ingredients: [],
    ovenTime: 0,
    status: "idle"
  });

  function addIngredient(ingredient: string) {
    if (ingredient === 'pineapple') {
      throw new Error('Step away from the pizza');
    }

    update((store) => ({
      ...store,
      ingredients: [...store.ingredients, ingredient],
    }));
  }

  return {
    subscribe,
    addIngredient,
  };
}

const pizzaStore = createPizzaStore();

export default pizzaStore;

```

Basically, we wrap a store in a function that holds additional logic. By returning the `subscribe` method, we can subscribe to the store's value in our component, same as before. But we can also return other functions, defining how we want the outside world to interact with our store. You can think of it as adding methods to interact with the underlying writable store - like an API.

As you can see, stores are very flexible, and you can actually combine them with other state management libs. For that, I highly recommend you check out this post on [using stores with Zustand](https://jfranciscosousa.com/blog/using-zustand-with-svelte), a very nice state management lib. 

## Wrapping the wrappers
We can actually extend this concept of wrapping a store. Say we have several stores, and we want them all to have some shared functionality, like syncing changes to local storage, or a remote DB. We can create a base store that receives the writable store and wrapper function we wrote previously, and passes some base functions into that wrapper:

```typescript
// _baseStore.ts
interface WrapperProps<T> extends Writable<T> { 
  _syncToLocal: (key: string) => Unsubscriber;
  _set: (args: Partial<T>) => void;
}

export default function _baseStore<T, I>(
  store: Writable<T>,
  wrapperFn: (args: WrapperProps<T>) => I
): I {
  const { update, subscribe } = store;
    
  function _set(args: Partial<T>) {
    store.update((st) => ({
      ...st,
      ...args,
    }));
  }

  function _syncToLocal(key: string) {
    return subscribe((val) => {
      localStorage.setItem(key, JSON.stringify(val));
    });
  }

  return wrapperFn({ ...store, _syncToLocal, _set });
}
```

We then pass it our custom store:

```typescript
// customPizza.ts
type PizzaStore = {
  ingredients: string[];
  ovenTime: number;
  status: 'idle' | 'preparing' | 'baking' | 'ready';
};

const store = writable<PizzaStore>({
  ingredients: [],
  ovenTime: 0,
  status: "idle"
});

const pizzaStore = _baseStore(
  store,
  ({ _syncToLocal, subscribe, update }) => {
    
    //use the received function
    _syncToLocal('myPizza');

    function addIngredient(ingredient: string) {
      if (ingredient === 'pineapple') {
        throw new Error('Step away from the pizza');
      }

      update((st) => ({
        ...st,
        ingredients: [...st.ingredients, ingredient],
      }));
    }

    return {
      subscribe,
      addIngredient,
    };
  }
);

export default pizzaStore;

```

As you can see, the wrapper contains all the same logic as before, except now it also receives `_syncToLocal`. In this way, we can move that sort of common functionality to another layer, where it can be easily reused by other stores. Let's say you also have cupcakes in your app:


```typescript
const store = writable<CupcakeStore>({
  toppings: [],
  tasty: true,
});

const cupcakeStore = _baseStore(
    store, 
    ({ subscribe, _syncToLocal }) => {
  
      /* cupcake things */

      _syncToLocal('myCupcake');

      return {
        subscribe,
      };
});

export default cupcakeStore;
```

You might have noticed I also added a `_set` function - this is just a more concise way of using the regular `update` method, so instead of writing:

```typescript
update((store) => ({
    ...store,
    foo: bar    
}))
```
we can just write:

```typescript
_set({ foo: bar })
```

It might not seem like a huge improvement, but it's quite useful when you want to update values multiple times in a function, for example. 

## Instances

So far `pizzaStore` has been a standalone store, assuming our app will only have one pizza. However it can be useful to have instantiable stores - imagine your app allows the user to create as many pizzas as they want. There are a couple of things needed:
 1. Allow the creation of new pizzas through `pizzaStore`
 2. Store all the pizzas somewhere, so we can access them elsewhere in our app.

The first issue is pretty simple, we simply export the function. For the second issue, one approach is to use a _store of stores_. It's a custom store that holds an object of `string: PizzaStore`:

```typescript
// allPizzasStore.ts
type AllPizzasStore = Record<string, PizzaStore>;

function createAllPizzasStore() {
  const { subscribe, update } = writable<AllPizzasStore>({});

  function addPizza(name: string, pizza: PizzaStore) {
    update((st) => ({
      ...st,
      [name]: pizza,
    }));
  }

  return {
    subscribe,
    addPizza,
  };
}

const allPizzasStore = createAllPizzasStore();

export default allPizzasStore;
```

We then add our pizzas to this underlying store whenever they are created. In order to later get the store we need, we also pass in a `name` key to store it with:

```typescript
//pizzaStore.ts
type PizzaWritableStore = {
  ingredients: string[];
  ovenTime: number;
  status: 'idle' | 'preparing' | 'baking' | 'ready';
};

export interface PizzaStore extends Writable<PizzaWritableStore> {
  addIngredient: (ingredient: string) => void;
};

export default function pizzaStore(name: string): PizzaStore {
  const store = writable<PizzaWritableStore>({
    // writable store data
  });

  const customStore = _baseStore(
    store,
    ({ _set, _syncToLocal, update }) => {

      // .. other functions like addIngredients, etc

      return {
        ...store,
        addIngredient,
      };
    }
  );

  // add it to the store of stores
  allPizzasStore.addPizza(name, customStore);
    
  return customStore;
}

```

And then we use it:

```html
<!--Allow user to create new pizzas-->
<button 
    type="button" 
    on:click={() => pizzaStore("pepperoni")}
>
    Add pepperoni
</button>
<button 
    type="button" 
    on:click={() => pizzaStore("tuna")}
>
    Add tuna
</button>

<!--And in some other component-->
<script lang="ts">
    import allPizzasStore from "./allPizzasStore";
        
    let pep = $allPizzasStore.pepperoni
    let tuna = $allPizzasStore.tuna
</script>

<div>
    The pepperoni is {$pep.status}
    <button 
        type="button" 
        on:click={() => pep.bake()}
    >
        Bake it
    </button>
</div>

```

Any pizza we now create is accessible in the rest of the app via the `allPizzaStore`! 

## Wrapping up
Hopefully this demonstrates how flexible and useful stores can be in Svelte. Often, a simple store may be enough, but when necessary, we can easily adapt our stores to fit our needs.

Thanks for reading!
