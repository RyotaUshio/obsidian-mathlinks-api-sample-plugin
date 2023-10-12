import { BlockSubpathResult, HeadingSubpathResult, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Provider, addProvider } from 'obsidian-mathlinks';

interface MyPluginSettings {
	key: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	key: 'link-display'
}

class MyProvider extends Provider {
	constructor(mathLinks: any, public plugin: MyPlugin) {
		super(mathLinks);
	}

	provide(
		parsedLinktext: { path: string, subpath: string },
		targetFile: TFile | null,
		targetSubpathResult: HeadingSubpathResult | BlockSubpathResult | null,
		sourceFile: TFile
	): string | null {

		const { app, settings } = this.plugin;
		const { path } = parsedLinktext;

		if (!targetFile) return null;

		const targetCache = app.metadataCache.getFileCache(targetFile);
		if (!targetCache) return null;

		let noteTitleDisplay = targetCache.frontmatter?.[settings.key];

		if (typeof noteTitleDisplay != 'string') noteTitleDisplay = targetFile.basename;

		if (targetSubpathResult?.type == 'heading') {
			return (path ? `${noteTitleDisplay} - ` : '')
				+ `h${targetSubpathResult.current.level}:${targetSubpathResult.current.heading}`;
		} else if (targetSubpathResult?.type == 'block') {
			const { id } = targetSubpathResult.block;
			let blockType = targetCache?.sections?.find(section => section.id == id)?.type;
			if (!blockType && targetCache?.listItems?.find(section => section.id == id)) {
				blockType = 'listitem';
			}
			blockType = blockType ?? 'block';
			return (path ? `${noteTitleDisplay} - ` : '')
				+ `${blockType}:${id}`;
		}

		return noteTitleDisplay;
	}
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MySettingTab(this));
		this.addChild(
			addProvider(this.app, (mathLinks) => new MyProvider(mathLinks, this))
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MySettingTab extends PluginSettingTab {
	constructor(public plugin: MyPlugin) {
		super(plugin.app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Property key')
			.setDesc('What property do you want to use to specify how the note title is displayed in a link?')
			.addText(text =>
				text.setValue(this.plugin.settings.key)
					.onChange(async (key) => {
						this.plugin.settings.key = key;
						await this.plugin.saveSettings();
					})
			);
	}
}
