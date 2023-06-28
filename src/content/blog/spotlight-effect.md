---
title: 'Infinite looping React component'
publishedAt: April 2022
description: Spotlight effects can be a pretty creative way of revealing content on your website. And they’re surprisingly easy to create with a little JS and CSS!
---


# Spotlight effect with JS and CSS
Spotlight effects can be a pretty creative way of revealing content on your website. And they're surprisingly easy to create with a little JS and CSS!

<iframe src="https://codesandbox.io/embed/spotlight-zyg9vu?fontsize=14&hidenavigation=1&theme=dark&view=preview"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="Spotlight "
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

## The basic idea
**TLDR; Use CSS radial gradient backgrounds, and then use JS to track the mouse movement and move the center of the gradient.**

There are other, more complex ways of doing this - you could use canvas or external libraries - but I find the simpler approach is a good starting point and should work well enough for most use cases.

Let's get started:


```css
#spotlight {
  position: fixed;
  opacity: 1;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  pointer-events: none;
}
```
```htmlembedded
<div id="spotlight"></div>
```
```jsx
const spotlightEl = document.querySelector("#spotlight");

function handleMouseMove(event) {
    const { clientX, clientY } = event;
    
    spotlightEl.style.background = `radial-gradient(circle at ${clientX}px ${clientY}px, #00000000 10px, #000000ee 350px)`;
}

document.addEventListener("mousemove", handleMouseMove)
```

And...that's pretty much it. 

The `#spotlight` div is positioned so that it always covers the entire viewport. We then attach an event listener to listen to the mouse's movement, and set the `X` and `Y` directly in the `radial-gradient` CSS value. 

The `#00000000 10px, #000000ee 350px` part basically means we want a gradient that is transparent at it's center, and at 350px from the center is a slightly transparent black. That's how the gradient center reveals what's beneath.

## Making it configurable
So far we have a basic spotlight, so let's go ahead and improve it. 

We can create a `Spotlight` class that allows you to easily set up new spotlights and pass in some options:
 - `toggleEl` is the id of the element you want to use as a trigger to toggle the spotlight.
 - `innerRadius` and `outerRadius` set the spotlight size.
 - `outerColor` sets the background color (try passing in `red` for a truly bleeding edge experience).

The class also provides methods for switching the spolight on and off.

<iframe src="https://codesandbox.io/embed/spotlight-zyg9vu?fontsize=14&hidenavigation=1&module=%2Fsrc%2FSpotlight.ts&theme=dark&view=editor"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="Spotlight "
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>
   
## Making the light feel more natural
To make it a look a little more natural, there are a couple of added touches. 

First, there is a slight delay in the spotlight movement. This adds a sense of weight to the light, like we're dragging it around with our mouse.
```typescript
handleMouseMove(event: MouseEvent) {
    setTimeout(() => {
      this.updateEl(event.clientX, event.clientY);
    }, 50);
}
```

Also, you'll notice the light "pulses" slightly - continually increasing and decreasing. 

But how do we get it to work? 

My first instinct was to animate the gradient size, but that's not actually possible in CSS! Next I thought of somehow changing the `outerRadius` value in steps inside a function called in a `setInterval`, but that turned out to be a really stupid idea. Finally, I came up with the simple solution - animate the scale of the *entire spotlight div* with a CSS animation.

```css
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.1);
  }
}
```
```typescript
this.el.style.animation =
        "pulse 3s ease-in-out infinite alternate forwards";
```
This way, we don't need to touch the actual gradient, we just animate the entire "canvas", stretching the gradient in the process. I also used CSS animations for the "switching on/off" part.


## Wrapping up
Obviously, you shouldn't be using spotlights in every single page (please don't!). But when used right, they're a nice way for users to feel like they're discovering some cool concealed content for the first time. 

**Thanks for reading!**


