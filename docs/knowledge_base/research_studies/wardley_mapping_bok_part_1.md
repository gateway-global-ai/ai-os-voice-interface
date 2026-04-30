# Wardley Mapping Body Of Knowledge - Part 1 Source Notes

## Source Manifest

| Source | URL | Verification status |
|---|---|---|
| Building a Body of Knowledge using Pinecone, Langchain and OpenAI - Part 1 | https://colab.research.google.com/github/tractorjuice/Building_BoK/blob/main/Building_Wardley_Mapping_Body_of_Knowledge_Part_1.ipynb/ | Source notebook fetched from raw GitHub for review-stage curriculum use. |
| Raw notebook | https://raw.githubusercontent.com/tractorjuice/Building_BoK/main/Building_Wardley_Mapping_Body_of_Knowledge_Part_1.ipynb | Source notebook content reviewed as a static artifact. |
| Pinecone Rust SDK | https://github.com/pinecone-io/pinecone-rust-client | README and `Cargo.toml` reviewed as SDK reference material. Runtime API access remains unverified. |
| Pinecone Rust SDK docs | https://docs.rs/pinecone-sdk/latest/pinecone_sdk/ | External docs reference from the SDK README; link reachability is unverified in this artifact. |
| Pinecone crate | https://crates.io/crates/pinecone-sdk | External crate reference from the SDK README; install is unverified in this artifact. |

## What The Notebook Does

The notebook is Part 1 of a Wardley Mapping body-of-knowledge pipeline. It collects candidate Wardley Mapping video sources, writes video IDs to a Google Drive folder, and downloads audio clips for later processing. The notebook states that it does not require a GPU runtime.

The notebook title describes the broader intended stack as Pinecone, LangChain, and OpenAI, but this Part 1 notebook only covers data collection and audio download preparation. It does not build a Pinecone index, run LangChain retrieval, or call OpenAI in the reviewed cells.

## Collection Workflow

1. Mount Google Drive in Colab.
2. Set `DOCS_FOLDER` to `/content/gdrive/MyDrive/WardleyKB`.
3. Create an `audio` subdirectory if it does not exist.
4. Install and import `scrapetube`.
5. Collect YouTube video IDs from Wardley-related playlists and searches.
6. Deduplicate the video ID lists.
7. Write the IDs into `audio/videos.txt`.
8. Install `yt-dlp`.
9. Download the best available audio for each video into `audio/clips`.
10. Optionally try `pytube` as an alternate audio downloader.

## Video Source Sets In The Notebook

| Label | Notebook method | Notes |
|---|---|---|
| MapCamp 2020 | `scrapetube.get_playlist("PLP0vnsXbJsRXpKWEFe956zjGrawwQ0wb3", limit=10)` | Limited to the first 10 videos in the notebook. |
| MapCamp 2021: Use Case Edition | `scrapetube.get_playlist("PLP0vnsXbJsRX11ANTNANzKQQoxTLKRvV1", limit=10)` | Limited to the first 10 videos in the notebook. |
| Wardley Mapping Meetups | `scrapetube.get_playlist("PLP0vnsXbJsRWkXBHkdWTVbByRfY92YYR5", limit=10)` | Limited to the first 10 videos in the notebook. |
| Wardley Mapping search | `scrapetube.get_search("Wardley Mapping", limit=10)` | Search output is live and unverified until run. |
| wardleymaps search | `scrapetube.get_search("wardleymaps", limit=10)` | Search output is live and unverified until run. |
| Platform Design Toolkit videos | `scrapetube.get_playlist("PLP0vnsXbJsRWkXBHkdWTVbByRfY92YYR5", limit=10)` | Same playlist ID as Wardley Mapping Meetups in the reviewed notebook. |
| Simon Wardley videos | `scrapetube.get_playlist("PLFwBSJ0MOI-27N3Tnx5_CCNPZqrq0gOU-", limit=10)` | Limited to the first 10 videos in the notebook. |
| Mark Craddock videos | `scrapetube.get_playlist("PLFwBSJ0MOI-351lB7tPAiUs_a_2lIo_-J", limit=10)` | Limited to the first 10 videos in the notebook. |

## Local AI OS Use

For the AI OS, this artifact is a source-backed knowledge note for:

- reviewing the data collection plan before running live network operations
- creating a Course Creator draft for a Wardley Mapping Body of Knowledge course
- designing a later Rust-managed vector indexing tool
- documenting which parts are verified source claims versus runtime evidence still required

This artifact should be uploaded or seeded as review-stage knowledge. It is not proof that the notebook ran, that videos downloaded, or that a Pinecone index exists.

## Pinecone Rust Client Notes

The Pinecone Rust SDK README identifies:

- package name: `pinecone-sdk`
- version in the reviewed README and `Cargo.toml`: `0.1.2`
- Rust version tested by the SDK: `1.78.0`
- repository: https://github.com/pinecone-io/pinecone-rust-client
- license in `Cargo.toml`: Apache-2.0
- API key environment variable: `PINECONE_API_KEY`
- optional control plane host environment variable: `PINECONE_CONTROLLER_HOST`
- default control plane host: `https://api.pinecone.io`

The README examples cover client construction, creating serverless and pod indexes, listing and describing indexes, configuring and deleting indexes, describing index statistics, upserting vectors, querying by ID or value, deleting vectors, fetching vectors, updating vectors, listing vectors, and collection operations.

## Review-Stage Course Shape

Recommended course title: Wardley Mapping Body of Knowledge.

Recommended lesson: Source Ingestion And Vector Knowledgebase Planning.

Learning outcomes:

- Explain how the notebook gathers Wardley Mapping video IDs and audio sources.
- Identify which cells perform live network or Google Drive operations.
- Separate source-backed notebook behavior from unverified runtime evidence.
- Describe how `pinecone-sdk` could support a later Rust indexing/query tool.
- Define no-mock gates for running YouTube collection, audio download, embedding, upsert, and query steps.

Capstone:

Design a no-mock Wardley Mapping knowledgebase runbook that starts with source collection, records exact command output, stores source manifests, and only promotes Pinecone retrieval claims after real index/list/upsert/query evidence exists.

## Verification Boundaries

Verified for this artifact:

- The raw notebook contains Google Drive setup, `scrapetube` collection, `yt-dlp` download, and `pytube` fallback cells.
- The reviewed notebook content is Part 1 and focuses on collecting data for later processing.
- The Pinecone Rust client README and `Cargo.toml` describe `pinecone-sdk` 0.1.2 and the API configuration variables listed above.

Unverified until real execution:

- YouTube playlist/search reachability.
- Exact video IDs returned by `scrapetube`.
- Audio download success through `yt-dlp` or `pytube`.
- Google Drive mount, folder creation, and file persistence.
- Pinecone account reachability.
- Pinecone index creation, listing, upsert, query, fetch, update, or delete behavior.
- LangChain and OpenAI integration.
- Any production readiness or published lesson status.

## No-Mock Gate

Do not mark this course, lesson, or tool accepted until real command output exists for each claimed runtime step. If a command cannot be run, record the step as `blocked` or `unverified` rather than substituting screenshots, fake logs, simulated rows, or placeholder evidence.
