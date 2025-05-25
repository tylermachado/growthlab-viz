# Demo for Dropdown

Here is the Dropdown Menu demo for Growth Lab, as built by Tyler Machado.

## Why I Did What I Did

- I chose SvelteKit because, for quickly prototyping apps on my local machine, I've found that getting up and running with a fresh project is so much faster here than with React and whichever framework that React project is using. (In my opinion, this was a drawback of sunsetting `create-react-app`.) If this was 18 months ago, I would have built in React to evaluate my chops in that framework -- however, nowadays I choose Svelte due to the aforementioned practical consideration, _and also_ that I think Svelte 5's syntax has updated so that it's a lot closer to React than previous versions were.

- My design philosophy with apps like this is typically to have useful functions broken out into their own JS or TS files, and concrete UI pieces broken out into their own components. This was straightforward enough that I just needed the one Selector component, though I considered whether the individual pieces of that component could be further component-ized. 

I also just had the one helper function to take the default data JSON file and turn it into something nested to reflect the desired nested output. I think I would also like to take the Selector's search filter function and put that into its own file, too. 

## What I Would Do Differently in Production

- Some of the styles are off -- the dropdown, in particular, has some oddities around line height and the hover state not going all the way to the left. Absent a design mockup, I chose not to worry too much about getting these items exact compared with the functionality.

- In the Selector component, the function to filter based on the search input grew quite a bit longer than I initially imagined, honestly to a point where I should break it out into its own file.

- Accessibility is not where it needs to be for production, particularly as it relates to keyboard navigation. In this case I would collaborate with the designer to figure out exactly what the keyboard nav UX ought to look like.

## Where I Used AI

I prefer to use Claude as an AI assistant as that has given me the best results in my experimenting. In this case I used it to:
- code review my code
- help me figure out how filtering recursively with the parents/children could work
- help me figure out proper TypeScript support around interfaces
- debug an error around getting the dropdown open that was happening due to how Svelte updates the DOM and adds scoped CSS classes