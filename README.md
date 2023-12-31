# Sample Plugin for Obsidian MathLinks API 

This is a sample [Obsidian.md](https://obsidian.md) plugin for demonstrating the usage of [MathLinks](https://github.com/zhaoshenzhai/obsidian-mathlinks) API.

**MathLinks** is a community plugin that renders MathJax in your links.
However, its power is not limited to math. Essentially, it can be used to
- change how a link is displayed
- _(planned)_ using arbitrary inline markdown formatting syntaxes supported by Obsidian (see [here](https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax) and [here](https://help.obsidian.md/Editing+and+formatting/Advanced+formatting+syntax#Math))
	- Currently, only inline math is supported, but support for other syntaxes will also come soon.
- without actually touching your note's content (e.g. typing an alias for each link), as well as dynamically update the displayed contents.

**MathLinks API** is here with you to allow other community plugins to utilize this power! 
This repository contains a sample plugin that displays a link to a heading/block like this:

![without property](fig/without-property.png)

Moreover, if the note's property contains a certain key that the user defines in the plugin's setting tab (`link-display` by default), the note title in the links will be replaced with the corresponding property value:

![with property](fig/with-property.png)


## Usage

In this section, I will walk you through the process of building a simple plugin using MathLinks API. 

> [!WARNING]
> Make sure that both the npm package `obsidian-mathlinks` and the Obsidian plugin _MathLinks_ are version 0.5.1 or higher.

### Installation

```
$ npm i -D obsidian-mathlinks
```

### Import

https://github.com/RyotaUshio/obsidian-mathlinks-api-sample-plugin/blob/caaeeb06199f76c9231e329c6e0896f4af178f9b/main.ts#L3

### Implement a custom provider

Given a pre-processed information of a link, `Provider` determines how the link is displayed through its `provide` method.

Let's take a link `[[Note#heading]]` as an example.
In this case, the "pre-processed information" contains:

- `parsedLinktext: { path: string, subpath: string }` - `{ path: 'Note', subpath: '#heading' }`
- `targetFile: TFile | null ` - [TFile](https://docs.obsidian.md/Reference/TypeScript+API/TFile/TFile)  object for `Note.md` if the link path `Note` is successfully resolved, `null` otherwise
- `targetSubpathResult: HeadingSubpathResult | BlockSubpathResult | null`  - The heading's information given by [resolveSubpath](https://docs.obsidian.md/Reference/TypeScript+API/resolveSubpath)
- `sourceFile: TFile` - [TFile](https://docs.obsidian.md/Reference/TypeScript+API/TFile/TFile)  object for the note where this link is stored in

To implement your custom provider, define a subclass of `Provider` and implement its `provide` method. It should return
- `string` that will be interpreted as a markdown source for the link's displayed text
	- in the near future, arbitrary inline markdown syntaxes such as `**bold**`/`$math$` will be allowed. But currently, only inline math is supported.
- or `null` when your provider doesn't want to provide any custom displayed text. 
	- In other word, your provider will be ignored when returning `null`.

https://github.com/RyotaUshio/obsidian-mathlinks-api-sample-plugin/blob/983d2fb27d03faefa43cd6f6048a47e69bac97a8/main.ts#L23-L62

### Register your provider

In the `onload` method of your plugin, register your custom provider.

- `addProvider` function creates an instance of your provider class using the factory function passed as the second parameter, and then registers it to MathLinks. Finally, it returns the provider object.
	- You have accesss to the MathLinks plugin instance inside the factory function.
- In most cases, you will want to pass the resulting provider to `addChild` method of your plugin so that the provider will be properly unloaded when your plugin gets disabled. Otherwise, you are responsible to manage its lifecycle on your own.
- Make sure you wrap the `addProvider` call in `this.app.workspace.onLayoutReady(() => {...})` so that it will be called after MathLinks is loaded.

```ts
export default class MyPlugin extends Plugin {
	async onload() {
        ...
		this.app.workspace.onLayoutReady(() => {
		    this.addChild(
			    addProvider(this.app, (mathLinks) => new MyProvider(mathLinks, this))
		    );
		});
        ...
	}
}
```

### Tell MathLinks to update the displayed text

Use `update(app: App, file?: TFile)` to inform MathLinks that it should update the display text of links.
If `file` is given, MathLinks will only update the notes affected by changes in that file.
Otherwise, MathLinks will update all notes currently open.

### Source mode

`Provider` has `enableInSourceMode` property, which controls whether your provider gets activated in Source mode or not. 
The default implementation can be found [here](https://github.com/zhaoshenzhai/obsidian-mathlinks/blob/cb9ef4378050514d20ed94ceb88a1c21ddef7b77/src/api/provider.ts#L17-L24).

You can keep your provider in sync with the plugin's settings by the following getter/setter.

https://github.com/RyotaUshio/obsidian-mathlinks-api-sample-plugin/blob/983d2fb27d03faefa43cd6f6048a47e69bac97a8/main.ts#L64-L74

If you want to just follow MathLinks's settings, you can use the following getter:

https://github.com/RyotaUshio/obsidian-mathlinks-api-sample-plugin/blob/983d2fb27d03faefa43cd6f6048a47e69bac97a8/main.ts#L80-L82

> [!NOTE]
> In source mode, only wikilinks `[[...]]` are supported.

## Remarks

- The users of your plugin have to install not only your plugin but also MathLinks.
- A breaking change might be introduced in the future.
