# Narratium

> **Reshape the world through imagination, discover yourself through choices.**

<p align="center">
  <img src="public/image.png" width="80%" />
</p>

![GitHub stars](https://img.shields.io/github/stars/Narratium/Narratium.ai?style=social)
![GitHub commits](https://img.shields.io/github/commit-activity/m/Narratium/Narratium.ai)

[🇨🇳 中文文档](./README_ZH.md)

**Narratium** is an AI-powered immersive interactive storytelling and creation platform, aiming to be an open-source alternative to AI Dungeon and a more user-friendly version of SillyTavern. Whether exploring fantasy worlds, seeking emotional resonance, or rewriting history, anyone can become the protagonist of their own epic.

## 🌟 Product Overview

Narratium aims to deliver a lightweight storytelling engine combining context compression, memory systems, and graph-based knowledge retrieval (Graph-RAG) to ensure character consistency and world coherence in long-form stories, significantly enhancing the immersion and continuity of AI-generated narratives.

Narratium is currently presented as a web-based interactive game:

MVP 1.0 (AI automatically processes world books, no regular expression support):
: [Narratium MVP 1.0](https://narratium-ltc2-hwo6gila4-0xhacker.vercel.app/)

MVP 2.0 (supports world books and regular expressions, logic refinement in progress):
: [Narratium MVP 2.0](https://narratium.org)

## 🖼️ Page Preview

<p align="center"> <img src="public/show_1.png" width="100%" alt="screenshot 1"/> </p> 
<p align="center"> <img src="public/show_2.png" width="100%" alt="screenshot 2"/> </p>
<p align="center"> <img src="public/show_3.png" width="100%" alt="screenshot 3"/> </p>
<p align="center"> <img src="public/show_4.png" width="100%" alt="screenshot 4"/> </p>

## 🚀 Features

* ✨ **Immersive Adventure Mode**: Generate personalized story worlds where users freely explore and make decisions to drive the narrative.
* 🧠 **Efficient Memory Management**: Visual session management using React Flow; supports memory tracing, revisiting, and infinite branching.
* 🛠 **Character Cards & World Settings**: Fully compatible with SillyTavern character cards; manage character states, world lore, and dialogue history in a unified system.

## 📅 Roadmap

Current features include:

* ✅ Import and compatibility with SillyTavern character cards.
* ✅ Centralized character management and state integration.
* ✅ World Book + Regular Expression compatibility.
* ✅ Multi-model support (OpenAI / Ollama).
* ✅ Visual session memory management (React Flow integration).

Planned features:

* 🚧 **Automated Character Card Generator**
  Build an intelligent generator that creates SillyTavern-compatible character cards based on user-provided world and character descriptions.

* 🚧 **Local Data Management via IndexedDB**
  Support automatic RAG (Retrieval Augmented Generation) for enhancing narrative knowledge continuity.

* 🚧 **Epic Narrative Support**
  Enable creation of grand narratives similar to *The Witcher* or *Inheritance Cycle*, providing deeply immersive story experiences.

* 🚧 **Open Community for Sharing Characters & Stories**
  Allow users to upload, share, and discuss character cards and story scripts, fostering an open creative community.

## 🚀 Getting Started

### Clone the project

```bash
git clone https://github.com/Narratium/Narratium.ai.git
cd Narratium
```

### Install dependencies

```bash
pnpm install
```

### Configure models

* **OpenAI API Key**
* **Ollama Local Service**

### Run the project

```bash
pnpm run dev
```

Visit: [http://localhost:3000](http://localhost:3000)

## 🧩 Why Narratium?

In the world of AI-powered interactive storytelling, common pain points include:

### SillyTavern

Powerful but overwhelming for beginners. Its complex setups, difficult card formats, and chaotic ecosystem can discourage new players before the adventure begins.

### AI Dungeon

Once a pioneer of infinite storytelling, it now erects walled gardens. Limited contexts, closed models, and lack of world customization restrict true ownership of adventures.

### Narratium changes everything.

We aim to make storytelling both simple and powerful:

* **Beginner-friendly**: Ready to play, intuitive interface, clear adventure, characters, and memory tracking.
* **Open & Extensible**: Open-source with support for any LLM, expandable characters, worlds, and memories.
* **Immersive & Consistent**: Focused on coherent storytelling, world logic, and character consistency, making every adventure a warm, personal, and traceable epic.

## 📜 License Overview

This project consists of two distinct parts with independent licenses:

- ✅ Code: MIT License — open for commercial and non-commercial use with attribution.
- 🔒 Content: CC BY-NC-SA 4.0 — non-commercial use only, with attribution and same-license sharing required.

> For full license details, please refer to the [LICENSE.txt](./LICENSE.txt).

## 📬 Contact & Support

* GitHub Issues
* QQ & Discord community (coming soon)

Special thanks to the SillyTavern community and countless character card contributors.If you'd like to join the contributor list, please contact: [qianzhang.happyfox@gmail.com](mailto:qianzhang.happyfox@gmail.com)

## 🙌 Contributer

[![Contributors](https://contrib.rocks/image?repo=Narratium/Character-Card)](https://github.com/Narratium/Narratium.ai/graphs/contributors)

## ⭐ Star Growth

[![Stargazers over time](https://starchart.cc/Narratium/Narratium.ai.svg?variant=dark)](https://starchart.cc/Narratium/Narratium.ai)

