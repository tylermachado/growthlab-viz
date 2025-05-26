# Demo for Dropdown

Here is the Dropdown Menu demo for Growth Lab, as built by Tyler Machado.

## How to Run This

- Download this repo
- In the local repo folder, open a Terminal
- In the Terminal, run ``npm install && npm run dev`` 
- Open the Local URL displayed, usually ``http://localhost:5173/``

## Why I Did What I Did

I had some experience drawing network graphs in D3 from earlier stops in my career, though it's been quite a while. I found a D3 component for Svelte as an example of drawing a network graph. This needed some updates, though; this component didn't include the hover effects to highlight the links and connected nodes, and also came with a number of controls around the visualization that were not part of the brief. I also had to update the code to work with TypeScript and Svelte 5. 

Initial attempts at rendering this viz were absolutely crawling, so I chose to use Canvas instead of SVG which solved that problem. That said, I do prefer SVG and the control that gives you as opposed to Canvas.

## What I Would Do Differently in Production

The current app lacks responsiveness, is the obvious thing. For the purposes of this exercise I think it was okay to have a set size but I wouldn't want to ship it like that.

The sample I was using also included a number of other functions for performance reasons when dealing with even larger network graphs. I think this is very important to consider in an app like this. However, even for as large as our dataset is here, rendering with Canvas instead of SVG seemed to solve any performance issues, so I think there's even more code that I could have stripped out that wouldn't be necessary here. (That said, if we pretend that this was meant to be a reusable component for future projects, it would be worth leaving that stuff in the codebase just in case we have ever larger datasets to use this with in the future.)

I also wasn't sure what to do with products that didn't have complete data. In the real world I'd be in contact with people with that domain knowledge to decide how to handle that.

## Where I Used AI

- Code review and cleanup suggestions
- To help where I had to convert pieces of code from SVG in early Svelte to Canvas in Svelte 5
- To debug an infinite loop error that I made that blocked rendering, due to infinite re-renders and me using the $effect rune incorrectly
- To help set our type definitions

