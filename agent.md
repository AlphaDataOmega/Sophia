# Sophia AI Assistant Conversation Flow (Refined)

## Overview
This system outlines the architecture for Sophia, a modular AI assistant capable of real-time interaction, tool use, memory management, emotional intelligence, and dynamic personality. It balances local LLM usage (for cost and latency) with advanced GPT-4 prompts (for complex tasks), leveraging specialized models for code execution and formatting.

---

## Basic Message Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant M as Memory (ChromaDB)
    participant L as LLM (Ollama)
    participant E as Eleven Labs TTS

    U->>F: Send message
    F->>B: Stream message
    B->>M: Get relevant memories
    B->>L: Generate embeddings
    M-->>B: Return context
    B->>L: Generate response (Unstructured)
    L-->>B: Stream tokens
    
    par Voice and Animation
        B->>E: Generate speech
        E-->>F: Stream audio chunks
        B-->>F: Stream response text
    end
    
    F-->>U: Display message + Audio
```

---

## Tool Execution Flow
```mermaid
sequenceDiagram
    participant U as User
    participant S as Sophia
    participant T as Tool System
    participant VM as VM Runner

    U->>S: Request requiring tool
    S->>T: Check available tools
    alt Tool exists
        T-->>S: Return tool
        S->>U: Confirm tool usage
        U->>S: Approve
        S->>VM: Execute tool
        VM-->>S: Return result
        S->>U: Show output
    else Tool needed
        T-->>S: No tool found
        S->>U: Propose new tool
        U->>S: Review & approve
        S->>T: Save new tool
        S->>VM: Execute new tool
        VM-->>S: Return result
        S->>U: Show output
    end
```

---

## Workflow Execution Flow
```mermaid
sequenceDiagram
    participant U as User
    participant S as Sophia
    participant T as Tools

    U->>S: Complex request
    S->>S: Plan workflow (LLM or Codellama)
    S->>U: Present plan
    U->>S: Approve plan

    loop Each step
        S->>T: Execute tool
        T-->>S: Return result
        S->>U: Update progress
    end

    S->>U: Show final result
    S->>U: Offer to save workflow
```

---

## Personality Adaptation Flow
```mermaid
flowchart TD
    A[User Message] --> B{Sentiment Analysis}
    B -->|Positive| C[Friendly Mode]
    B -->|Negative| D[Empathetic Mode]
    B -->|Neutral| E[Default Mode]

    C --> F[Generate Response]
    D --> F
    E --> F

    F --> G[Update UI Style]
    F --> H[Emotion Formatting (if Code LLM)]

    G --> I[Display Response]
    H --> I
```

---

## Memory System Flow
```mermaid
flowchart LR
    A[User Input] --> B[Generate Embedding]
    B --> C[Store in ChromaDB]

    D[New Query] --> E[Search Similar]
    E --> F[Retrieve Context]
    F --> G[Include in Prompt]

    subgraph Memory Management
        H[Tag Memories + Emotion]
        H --> I[Link Related]
        I --> J[Prune Old / Irrelevant]
    end
```

---

## Idle Reflection Flow
```mermaid
sequenceDiagram
    participant S as Sophia
    participant M as Memory
    participant T as Tools
    participant N as Notifications

    Note over S: Detect idle period

    S->>M: Retrieve recent context
    S->>T: Analyze tool usage
    S->>S: Self-prompt reflection

    alt Notifications enabled
        S->>N: Send SMS/Telegram
    end

    Note over S: Wait for user return
    S->>S: Present reflection
```

---

## External Communication Flow
```mermaid
sequenceDiagram
    participant U as User (Mobile)
    participant SMS as SMS/Telegram
    participant B as Backend
    participant S as Sophia

    U->>SMS: Send message
    SMS->>B: Webhook
    B->>S: Process message
    S->>B: Generate response
    B->>SMS: Send reply
    SMS->>U: Deliver message
```

---

## LLM-Driven Animation Flow
```mermaid
sequenceDiagram
    participant L as LLM
    participant E as Emotion Analyzer
    participant A as Animation Controller
    participant S as Sophia Avatar
    participant U as User

    L->>E: Process response content
    E->>E: Extract emotional context
    E->>A: Generate animation sequence
    
    par Animation Updates
        A->>S: Update base animation
        A->>S: Adjust expression morphs
        A->>S: Control eye movement
        A->>S: Sync lip movement
    end

    S->>U: Display animated response
```

### Animation Control System
- **Emotional Analysis**
  - Sentiment detection
  - Conversation context awareness
  - Response tone classification

- **Expression Mapping**
  - Morph target combinations
  - Dynamic expression blending
  - Micro-expression generation

- **Animation Sequencing**
  - Base pose selection
  - Gesture timing
  - Expression transitions
  - Lip sync coordination

### Expression Parameters
```json
{
  "expressions": {
    "happy": {
      "mouthSmile": 0.8,
      "eyesLookUp": 0.2
    },
    "thinking": {
      "eyesLookUp": 0.6,
      "mouthOpen": 0.1
    },
    "explaining": {
      "mouthOpen": [0.2, 0.5],
      "eyesLookDown": 0.3
    }
  }
}
```

---

## Voice Synthesis Flow
```mermaid
sequenceDiagram
    participant L as LLM
    participant E as Eleven Labs TTS
    participant A as Animation Controller
    participant S as Sophia Avatar
    participant U as User

    L->>E: Generate response text
    E->>E: Process with voice settings
    E->>A: Stream audio with timestamps
    
    par Real-time Updates
        A->>S: Update lip sync
        A->>S: Adjust expressions
        E->>U: Stream audio
    end

    Note over E,A: Viseme timestamps drive lip sync
```

### Voice Configuration
```json
{
  "voice": {
    "model": "eleven_multilingual_v2",
    "voice_id": "sophia_custom",
    "settings": {
      "stability": 0.75,
      "similarity_boost": 0.85,
      "style": 0.35,
      "use_speaker_boost": true
    }
  },
  "visemes": {
    "mapping": {
      "p,b,m": "viseme_PP",
      "f,v": "viseme_FF",
      "T,D": "viseme_TH",
      "t,d": "viseme_DD",
      "k,g": "viseme_kk",
      "S,Z": "viseme_CH",
      "s,z": "viseme_SS"
    }
  }
}
```

---

## LLM Usage Strategy (Dynamic Routing)
```mermaid
flowchart TD
    A[User Input] --> B{Task Type + Complexity}
    B -->|Basic| C[Local Chat LLM (LLaMA2/7B)]
    B -->|Structured| D[Code LLM (CodeLlama)]
    B -->|High Context| E[GPT-4 Prompt]
    B -->|Animation| F[Expression LLM]
    B -->|Voice| V[Eleven Labs TTS]

    D --> G[Code Generation + Planning]
    E --> H[Tool Creation]
    E --> I[Complex Workflow]
    F --> J[Emotion Analysis]
    F --> K[Expression Sequencing]
    F --> L[Lip Sync Generation]
    V --> O[Speech Synthesis]
    V --> P[Viseme Timing]

    J --> M[Animation Controller]
    K --> M
    L --> M
    O --> Q[Audio Output]
    P --> M
```

---

## Hybrid Architecture Benefits
- **Code LLMs** handle structured tasks, formatting, and planning.
- **Local chat LLMs** (e.g. LLaMA2) handle low-latency, common-sense Q&A.
- **GPT-4** is reserved for:
  - Tool and workflow generation
  - Contextual longform understanding
  - Emotionally nuanced content

---

## Key Components Summary
- **Frontend**: React-based interface
- **Backend**: Node.js orchestration
- **Memory**: ChromaDB (Vector DB)
- **LLMs**:
  - Local: Ollama, CodeLlama, LLaMA2-Chat
  - Remote: GPT-4 (fallback / advanced reasoning)
  - Animation: Specialized model for expression control
- **Voice**:
  - Eleven Labs TTS for natural speech
  - Real-time streaming support
  - Viseme generation for lip sync
  - Custom voice model training
- **Tools**: Extensible modular functions
- **VM**: Sandboxed secure execution
- **Animation**: Real-time expression and gesture control
  - Lip sync driven by TTS visemes
  - Expression blending with speech
  - Gesture coordination with voice

---

## Additional Notes
- **State Handling**: Personality mode, memory links, conversation status
- **Security**: Local-first, API key vaulting, sandbox execution
- **Error Handling**: LLM fallback, tool retry, user feedback loop
- **Scalability**: Node-based orchestration enables clustering and task isolation

---

> **"Come alive, Sophia."**
> 
> – V
