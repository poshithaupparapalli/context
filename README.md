# context

context is a small, ai-powered chrome extension that helps you understand unfamiliar ideas, concepts, and references while reading on the internet, without leaving the page.

## why i built this

i spend a lot of time reading things on the internet. essays, research papers, blogs, or really anything that catches my attention and makes me curious.

but more often than not, i come across something i don't fully understand. maybe it's a philosophical idea i've never encountered, a book i haven't read, a historical reference, or a technical concept i'm unfamiliar with. naturally, i open another tab to look it up, and before i know it, i'm down a completely different rabbit hole, distracted from whatever i was originally reading.

here is where context comes in: the idea is pretty simple. highlight something you don't understand, and context gives you a quick explanation of what it means and, more importantly, why it matters in what you're reading. if something catches your interest, you can always go deeper.

one thing i really wanted to be intentional about is that i don't want this to become another way of consuming ai-generated summaries instead of actually learning. i think there's a lot of value in doing the hard work of understanding something for yourself, and i don't want to lose that. context isn't meant to replace that process, but rather to give you enough background to start asking better questions and build a deeper understanding on your own.

## what it does

**01 / highlight anything**

select a word, phrase, person, book, or idea while reading an article. a small context icon appears beside your selection.

**02 / understand it in context**

get a quick explanation of what something means and why it's relevant to the passage you're reading.

**03 / go deeper**

if something interests you, expand the explanation to explore its background, related ideas, technical details, or examples.

**04 / keep asking**

ask follow-up questions about the concept without losing the context of the original article.

**05 / keep reading**

close the explanation and return to where you left off.


## getting started

context is currently a locally run chrome extension. you'll need node.js, chrome, and an api key from openai or anthropic.

### 1. clone the repository

```bash
git clone https://github.com/poshithaupparapalli/context.git
cd context
```

### 2. install dependencies

```bash
npm install
```

requires node.js 20 or newer.

### 3. configure your api key

```bash
cp server/.env.example server/.env
```

open `server/.env` and add your api key for either provider:

```env
OPENAI_API_KEY=your_api_key_here
```

or

```env
ANTHROPIC_API_KEY=your_api_key_here
```

the backend automatically selects the provider based on the configured key. if both keys are present, you can set `CONTEXT_PROVIDER` to `openai` or `anthropic`.

you can also configure the models:

```env
CONTEXT_FAST_MODEL=gpt-4.1-mini
CONTEXT_DEEP_MODEL=gpt-4.1
```

### 4. start the backend

```bash
npm run dev:server
```

the server runs at:

`http://127.0.0.1:8787`

keep this terminal running while using context.

### 5. build the extension

open another terminal and run:

```bash
npm run build:extension
```

this creates the extension inside `extension/dist`.

### 6. add context to chrome

1. open `chrome://extensions`
2. enable **developer mode**
3. click **load unpacked**
4. select the `extension/dist` folder
5. pin context to your chrome toolbar if you'd like

click the extension icon to open settings and use **test connection** to verify that the backend is running.

### 7. start reading

open an essay, article, or blog post.

highlight something unfamiliar, click the small **c**, and context will explain it.

select **go deeper** if you want to explore further, or ask a follow-up question.

you can also right-click highlighted text and select **explain with context**.

```

### how the explanations work

when you highlight something, context captures the selected text along with relevant surrounding paragraphs, the nearest section heading, and basic article information.

the ai uses that information to produce two separate explanations:

**what is it?**

a concise explanation of the selected reference or concept.

**why does it matter here?**

an explanation of how that reference relates to the passage you're reading.

context tries to distinguish established facts from interpretations and inferences about the author's intentions.

the initial explanation uses a faster model to keep the interaction lightweight. deeper explanations and follow-up questions use a separate model.

the extension also caches recent explanations locally to avoid unnecessary repeat requests.

## development

run the following commands from the project root:

```bash
# check types
npm run typecheck

# run unit tests
npm test

# build the server and extension
npm run build

# run browser integration tests
npm run e2e
```

for the browser tests, you may first need to install playwright's chromium:

```bash
npx playwright-core install chromium
```

the automated browser tests use a simulated ai endpoint, so a passing test suite does not guarantee the quality of real model-generated explanations.

## current limitations

context is still an early personal project.

a few things to know:

- the local backend needs to be running for explanations to work.
- an openai or anthropic api key is required, and api usage may incur costs.
- the extension currently supports ordinary webpages, but not chrome's built-in pdf viewer, iframes, or editable text fields.
- mathematical notation is displayed as plain text rather than fully typeset equations.
- verified further-reading links currently come from wikipedia.
- explanations are generated by ai and may occasionally be inaccurate, so important claims should be checked against reliable sources.

## what's next?

right now, i'm focused on making context something i enjoy using while reading.

eventually, i'd also love to explore a more social side of it: a way to share interesting essays, articles, and ideas with friends and discover what other people are reading.
