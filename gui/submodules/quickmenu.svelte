<script context="module">
  const name = 'Quick Menu';
  const icon = '<path d="M273.117 76.563c-52.488 0-101.824 20.43-138.933 57.539a198.531 198.531 0 0 0-22.067 26.234c-4.062 5.773-2.68 13.75 3.098 17.8a12.71 12.71 0 0 0 7.336 2.329c4.015 0 7.98-1.89 10.465-5.422a173.942 173.942 0 0 1 19.238-22.863c32.281-32.285 75.203-50.059 120.855-50.059 7.063 0 12.782-5.71 12.782-12.781 0-7.063-5.711-12.778-12.774-12.778ZM104.5 198.758c-6.652-2.375-13.96 1.066-16.355 7.699a196.223 196.223 0 0 0-5.832 19.336c-3.774 15.352-5.692 31.242-5.7 47.25 0 7.059 5.715 12.785 12.782 12.785 7.054 0 12.78-5.71 12.78-12.781 0-13.953 1.673-27.8 4.962-41.149a168.757 168.757 0 0 1 5.062-16.793c2.395-6.636-1.054-13.964-7.699-16.347Zm0 0"/><path d="M491.469 437.27c-.035-.036-.078-.055-.114-.094 35.543-47.078 54.817-104.121 54.817-164.149 0-72.957-28.414-141.554-80.008-193.152-106.5-106.496-279.789-106.504-386.285 0-106.504 106.496-106.504 279.79 0 386.285 51.59 51.59 120.187 80.008 193.152 80.008 60.028 0 117.067-19.266 164.149-54.816.035.039.058.078.09.113l263.91 263.91c7.468 7.48 17.277 11.234 27.09 11.234 9.812 0 19.62-3.746 27.113-11.226 14.969-14.977 14.969-39.254 0-54.219Zm-55.418-1.211c-43.555 43.546-101.446 67.535-163.035 67.535-61.579 0-119.48-23.989-163.036-67.535-89.886-89.887-89.886-236.153 0-326.067 44.961-44.949 103.989-67.418 163.036-67.418 59.039 0 118.09 22.477 163.035 67.418 43.543 43.555 67.531 101.445 67.531 163.035-.008 61.578-23.992 119.48-67.531 163.028Zm0 0"/>';

  export function fuzzy_simple(string, match) {
    const _string = string.toLowerCase();
    const _match = match.toLowerCase();

    let offset = -1;
    for (const part of _match) {
      offset = _string.indexOf(part, (offset + 1));

      if (offset === -1) {
        break;
      }
    }
    return offset > -1;
  }

  export function fuzzy(string, match) {
    const _string = string.toLowerCase();
    const _match = match.toLowerCase();

    let offset = -1;
    const ranges = [];
    for (const part of _match) {
      offset = _string.indexOf(part, (offset + 1));
      if (offset === -1) {
        return 0;
      }

      if (ranges.length) {
        const lastRange = ranges[ranges.length - 1];

        if ((offset - lastRange[lastRange.length - 1]) === 1) {
          lastRange.push(offset);
          continue;
        }
      }

      ranges.push([ offset ]);
    }

    let weight = 0;
    ranges.forEach(range => weight += range.length);
    return weight;
  }


  export function fuzzyHighlight(string, match) {
    if (!match) {
      return string;
    }

    const _string = string.toLowerCase();
    const _match = match.toLowerCase();

    let offset = -1;
    const ranges = [];
    for (const part of _match) {
      offset = _string.indexOf(part, (offset + 1));
      if (offset === -1) {
        break;
      }

      if (ranges.length) {
        const lastRange = ranges[ranges.length - 1];

        if ((offset - lastRange[lastRange.length - 1]) === 1) {
          lastRange.push(offset);
          continue;
        }
      }

      ranges.push([ offset ]);
    }

    const highlighted = ranges.reduce((current, range, i) => {
      const start = range[0];
      const end = range[range.length - 1];

      if (!i) {
        if (start) {
          current += string.slice(0, start);
        }
      }
      else {
        const prev = ranges[i - 1];
        const prevEnd = prev[prev.length - 1];
        current += string.slice(prevEnd + 1, start);
      }

      current += `<mark>${string.slice(start, (end + 1))}</mark>`;

      if (i === (ranges.length - 1) && end < (string.length - 1)) {
        current += string.slice(end + 1);
      }

      return current;
    }, '');

    return highlighted;
  }

  const hints = [
    [ '<m> to hide', '<kbd>esc</kbd>' ],
    [ '<m> to navigate', '<kbd>↑</kbd> <kbd>↓</kbd>' ],
    [ '<m> to select', '<kbd>↵</kbd>' ],
    [ '<m> to pin', '<kbd>shift</kbd> + <kbd>↵</kbd>' ],
  ];
</script>

<script>
  import { tick, getContext } from 'svelte';
  import { fly } from 'svelte/transition';
  import { language, translate } from 'helpers/webdesq/stores.js';

  const nodes = {};
  const storekey = 'johbog/quickmenu/pins';

  const app = getContext('app');

  $: extensions = $app.registered || {};

  let visible = false;

  let suggestions = {};
  let selected, filter = '';

  let pins = localStorage[storekey] ? JSON.parse(localStorage[storekey]) : [];
  $: if (JSON.stringify(pins) !== localStorage[storekey]) {
    localStorage[storekey] = JSON.stringify(pins);
  }

  $: selectable = Object.entries(suggestions).flatMap(([ key, cluster ]) => {
    const keys = cluster.options.map(option => `${key}:${option.index}`);
    return keys;
  });

  $: if (selected && !selectable.includes(selected)) {
    selected = null;
  }

  // TODO: cleanup, move to plugins where needed...
  const extensionsOld = {
    toolbar: {
      title: 'Toolbar',
      options: () => {
        const instances = document.querySelectorAll('.page > .toolbar');
        // Find nearest visible toolbar
        const toolbar = Array.from(instances).find(node => (node.offsetParent !== null));
        if (!toolbar) {
          return [];
        }

        const buttons = toolbar.querySelectorAll('button');

        const result = Array.from(buttons).map((node, index) => ({
          title: node.getAttribute('aria-label') || '',
          action: () => node.click(),
          index: index,
          icon: node.querySelector('svg:first-child')?.outerHTML,
        }));

        return result;
      },
    },

    open: {
      title: 'Open module',
      options: () => {
        // Find all elements with openmodule attribute
        const instances = document.querySelectorAll('[data-openmodule]');
        const result = Array.from(instances).map((node, index) => {
          const separatorIndex = node.dataset.openmodule.indexOf(':');
          const id = node.dataset.openmodule.slice(0, separatorIndex);
          const title = node.dataset.openmodule.slice(separatorIndex + 1);

          const set = {
            title: title || id,
            action: () => node.click(),
            index: index,
            id: title ? id : null,
            icon: node.querySelector('svg:first-child')?.outerHTML,
          };

          return set;
        });
        return result;
      },
    },

    focusable: {
      title: 'Focus on',
      options: () => {
        const instances = document.querySelectorAll('[data-focus]');
        // Find nearest visible multifilter
        const result = Array.from(instances).flatMap((node, index) => {
          if (node.offsetParent === null) {
            return [];
          }
          return {
            title: node.dataset.focus || node.getAttribute('placeholder'),
            action: () => node.focus(),
            index: index,
          };
        });
        return result;
      },
    },
  };

  $: _extensions = Object.entries(extensions);

  let selectedHint = 0, selectedHintInterval, showAllHints;

  export async function toggle() {
    selectedHintInterval && clearTimeout(selectedHintInterval);

    if (visible) {
      visible = false;
      selected = null;
      filter = '';
      showAllHints = false;
      suggestions = {};
    }

    else {
      visible = true;
      await tick();
      document.body.append(nodes.panel);
      nodes.input.focus();
      selectedHintInterval = setInterval(() => {
        selectedHint = (selectedHint === (hints.length - 1)) ? 0 : (selectedHint + 1);
      }, 4000);
    }
  }

  function checkKeyShortcut(event) {
    // TODO: make shortcut configurable
    if (event.key === 'k') {
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        toggle();
      }
    }
  }

  function onOptionClick(option) {
    option.action();
    toggle();
  }

  async function selectSuggestion(direction) {
    switch (direction) {
      case 'up': {
        const index = selectable.indexOf(selected);
        if (index > 0) {
          selected = selectable[index - 1];
        }
        else {
          selected = selectable[selectable.length - 1];
        }
        break;
      }
      case 'down': {
        const index = selectable.indexOf(selected);
        if (index < (selectable.length - 1)) {
          selected = selectable[index + 1];
        }
        else {
          selected = selectable[0];
        }
        break;
      }
    }

    await tick();

    const selectedNode = nodes.suggestions && nodes.suggestions.querySelector('.selected');
    if (selectedNode) {
      const index = selectable.indexOf(selected);
      const block = [ 0, (selectable.length - 1) ].includes(index) ? 'center' : 'nearest';
      selectedNode.scrollIntoView({ block });
    }
  }

  function onInputKeydown(event) {
    event.stopPropagation();
    switch (event.key) {
      case 'Enter': {
        const _selected = selected || selectable[0];
        if (_selected) {
          const [ cluster, index ] = _selected.split(':');
          const option = suggestions[cluster].options.find(option => option.index === Number(index));
          if (event.shiftKey) {
            if (selected) {
              // Should only trigger for highlighted options
              togglePin(option);
            }
          }
          else {
            option?.action?.();
            toggle();
          }
        }
        break;
      }
      case 'Escape':
        toggle();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        selectSuggestion(event.key === 'ArrowUp' ? 'up' : 'down');
        break;
    }

    checkKeyShortcut(event);
  }

  function onWindowKeydown(event) {
    event.stopPropagation();

    switch (event.key) {
      case 'Tab': {
        // Trap focus
        const canFocus = !nodes.panel || (document.activeElement === nodes.panel) || nodes.panel.contains(document.activeElement);
        if (!canFocus) {
          event.preventDefault();
          nodes.input.focus();
        }
        return;
      }

      case 'Escape':
        if (visible) {
          toggle();
        }
        return;
    }

    checkKeyShortcut(event);
  }

  $: nodes.input && loadSuggestions(filter, pins);

  async function loadSuggestions(filter, pins) {
    await tick();

    const suggestionEntries = [];

    const pinned = {
      title: 'Pinned',
      options: [],
    };

    const match = filter.trim();

    const highestWeight = {};

    for (const [ key, extension ] of _extensions) {
      const options = typeof extension.items === 'function' ? await extension.items() : extension.items;

      if (!match) {
        // No filter, only show suggestions for pinned items
        options.forEach((option, index) => {
          if (!pins.includes(option.id)) {
            return;
          }

          pinned.options.push({ index, ...option });
        });

        continue;
      }

      highestWeight[key] = 0;

      const cluster = {
        title: extension.title,
        options: [],
      };

      const _options = options.flatMap((option, index) => {
        const weight = fuzzy(option.title, match);
        if (!weight) {
          // No weight, filter out
          return [];
        }

        if (highestWeight[key] < weight) {
          highestWeight[key] = weight;
        }

        return { weight, option, index };
      });

      cluster.options = _options.sort((left, right) => {
        const position = (left.weight < right.weight) ? -1 : (right.weight < left.weight) ? 1 : 0;
        return position;
      }).map(item => ({ index: item.index, ...item.option }));

      if (cluster.options.length) {
        suggestionEntries.push([ key, cluster ]);
      }
    }

    const sortedEntries = suggestionEntries.sort((left, right) => {
      const leftWeight = highestWeight[left[0]];
      const rightWeight = highestWeight[right[0]];
      const position = (leftWeight > rightWeight) ? -1 : (rightWeight > leftWeight) ? 1 : 0;
      return position;
    });

    const _suggestions = Object.fromEntries(sortedEntries);

    if (pinned.options.length) {
      suggestions = { pinned };
    }
    else {
      suggestions = _suggestions;
    }
  }

  function togglePin(option) {
    if (!option.id) {
      return;
    }
    const index = pins.indexOf(option.id);
    if (index > -1) {
      pins.splice(index, 1);
    }
    else {
      pins.push(option.id);
    }
    pins = pins;
  }
</script>

<svelte:window on:keydown="{onWindowKeydown}" />

<button class="toggle" aria-label="{translate('Show <m>', [ name, $language ])}" on:click="{toggle}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" class="quick-menu-icon">{@html icon}</svg>
</button>

{#if visible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div bind:this="{nodes.panel}" class="quick-menu" tabindex="-1" role="dialog" aria-label="{name}" on:click="{toggle}">
    <div class="quick-menu-window" role="document" on:click|stopPropagation transition:fly|local="{{ y: -200, duration: 200 }}">
      <input type="text"
        bind:this="{nodes.input}"
        bind:value="{filter}"
        placeholder="{translate('Search...', $language)}"
        on:keydown="{onInputKeydown}">
      {#if selectable.length}
        <ul class="quick-menu-suggestions" bind:this="{nodes.suggestions}">
          {#each Object.entries(suggestions) as [key, cluster ]}
            <li class="heading"><em>{translate(cluster.title, $language)}</em></li>
            {#each cluster.options as option}
              {@const _key = `${key}:${option.index}`}
              <li class:selected="{selected === _key}"
                class:pinned="{option.id ? pins.includes(option.id) : false}"
                on:click="{() => onOptionClick(option)}" on:mouseenter="{() => selected = _key}">
                {#if option.icon}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768">
                    {@html option.icon}
                  </svg>
                {/if}
                <span>{@html fuzzyHighlight(option.title, filter)}</span>
                {#if option.id}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" class="quick-menu-pin" role="button" aria-label="{translate('pin action', $language)}" on:click|stopPropagation="{() => togglePin(option)}">
                    <path d="M454 521l314 247-248-314zm0 0M402 247c-5 2-11 0-14-5L257 34a69 69 0 00-57-34c-18 0-36 8-51 23L26 147a71 71 0 00-22 58c2 20 14 38 33 50l208 132c4 3 6 8 4 13-40 103-28 190 36 259l373-375c-69-65-156-77-256-37zm0 0"/>
                  </svg>
                {/if}
              </li>
            {/each}
          {/each}
        </ul>
      {/if}
      <div class="quick-menu-footer">
        {#each hints as [ text, ...details ], i}
          {#if showAllHints || (i === selectedHint)}
            <div class="hint">{@html translate(text, [ ...details, $language ])}</div>
          {/if}
        {/each}
        <button class="info" aria-label="{translate('show all hints')}" on:click="{() => (showAllHints = !showAllHints)}">?</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .quick-menu {
    --quick-menu-padding: .6em;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 80;
    background-color: rgba(0,0,0, 0.05);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }

  .quick-menu-window {
    position: absolute;
    top: 6em;
    left: 50%;
    transform: translateX(-50%);
    border-radius: .25em;
    max-width: calc(100% - 30px);
    max-height: calc(100% - 8em);
    width: 100%;
    overflow: auto;
    box-sizing: border-box;
    background-color: #fff;

    box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.2), 0px 3px 12px rgba(0,0,0, 0.2);
    display: flex;
    flex-direction: column;
  }

  .quick-menu-suggestions {
    list-style: none;
    padding: 0;
    margin: 0;
    border-top: 1px solid #ccc;
    padding: var(--quick-menu-padding) 0;
    overflow: auto;
  }

  .quick-menu-suggestions > li {
    padding: calc(var(--quick-menu-padding) / 1.7) var(--quick-menu-padding);
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .quick-menu-suggestions > li + li {
    margin-top: .2em;
  }

  .quick-menu-suggestions > li > span {
    white-space: pre;
  }

  .quick-menu-suggestions > li > .quick-menu-pin {
    margin-left: auto;
    width: .9em;
    opacity: 0;
  }

  .quick-menu-suggestions > li.selected > .quick-menu-pin,
  .quick-menu-suggestions > li.pinned > .quick-menu-pin {
    opacity: 1;
  }


  .quick-menu-suggestions > li.pinned > .quick-menu-pin:not(:hover),
  .quick-menu-suggestions > li:not(.pinned) > .quick-menu-pin:hover {
    transform: scaleX(-1);
  }

  .quick-menu-suggestions > li.heading {
    font-weight: 700;
    font-size: 0.9em;
    padding: 0 var(--quick-menu-padding);
  }

  .quick-menu-suggestions > li.heading:not(:first-child) {
    border-top: 1px solid #ccc;
    padding-top: var(--quick-menu-padding);
    margin-top: var(--quick-menu-padding);
  }

  .quick-menu-suggestions > li.heading > em {
    opacity: 0.4;
    font-style: normal;
  }

  .quick-menu-suggestions > li.selected {
    background-color: #f1f3f9;
    color: #465a84;
  }

  .quick-menu-suggestions :global(mark) {
    background-color: #f1f3f9;
    color: #465a84;
    border-bottom: 1px solid currentColor;
  }

  .quick-menu-suggestions > li :global(svg) {
    width: 1.2em;
    fill: #465a84;
    opacity: .7;
    margin-right: .5em;
    flex-grow: 0;
  }

  .quick-menu-suggestions > li.selected :global(svg) {
    opacity: 1;
  }

  .quick-menu-footer {
    position: relative;
    padding: .5em calc(var(--quick-menu-padding) + 2em) .5em var(--quick-menu-padding);
    box-shadow: 0 3px 3px -3px rgba(0,0,0, 0.2) inset;
    background-color: rgba(0,0,0, 0.03);
    font-size: 0.9em;
    display: flex;
    flex-wrap: wrap;
  }

  .quick-menu-footer .hint {
    width: 100%;
  }

  .quick-menu-footer .hint + .hint {
    margin-top: .3em;
  }

  .quick-menu-footer .info {
    display: inline-block;
    position: absolute;
    top: .5em;
    right: var(--quick-menu-padding);
    width: 1.7em;
    height: 1.7em;
    line-height: 1.3em;
    text-align: center;
    font-size: .85em;
    font-weight: 700;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    border-radius: 50%;
    color: #465a84;
    background-color: #ffffff;
    box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.2), 0px 1px 3px rgba(0,0,0, 0.2);
    cursor: pointer;
    border: 1px solid transparent;
  }

  .quick-menu-footer .info:focus {
    border-color: currentColor;
  }

  .quick-menu-footer .info:active {
    box-shadow: none;
  }

  .quick-menu-footer .hint :global(kbd) {
    background-color: #465a84;
    border-radius: 3px;
    box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.2), 0px 1px 3px rgba(0,0,0, 0.2);
    color: #f2f3f6;
    display: inline-block;
    font-size: .9em;
    font-weight: 700;
    line-height: 1;
    padding: 2px 4px;
    white-space: nowrap;
    /* border: 1px solid currentColor; */
  }

  input {
    margin: 0;
    font-size: 1.4em;
    width: 100%;
    border: none;
    background: transparent;
    outline: none;
    padding: var(--quick-menu-padding);
    /* padding-left: 2.1em; */
    color: #465a84;
  }

  input::placeholder {
    color: #465a84;
    opacity: .7; /* Firefox */
  }

  .toggle {
    /* padding: 1em; */
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    margin: 0;
  }

  .toggle .quick-menu-icon {
    display: block;
    position: relative;
    fill: currentColor;
    width: 1.2em;
    opacity: 0.7;
  }

  .toggle:hover .quick-menu-icon {
    opacity: 1;
  }

  @media (min-width: 520px) {
    .quick-menu-window {
      max-width: 490px;
    }
  }
</style>
