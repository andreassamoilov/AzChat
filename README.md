# AzChat - Chat with Azure OpenAI Service

AzChat lets you run your own chatbot using Azure's OpenAI service. It allows you to use powerful LLMs like GPT-4o while keeping things private by running it yourself. This project was developed with the help of GPT-4 and Claude 3.5 Sonnet.

## Demo
[demo.webm](https://github.com/user-attachments/assets/5f867134-4c39-4c76-a0cb-a162f4e2c44a)

## Features

- Integration with Azure OpenAI service
- Privacy-focused: run your own instance of the service
- Web-based chat interface
- Support for multiple chat threads
- Markdown rendering for messages
- Syntax highlighting for code snippets

## Why Use This Service?

Azure OpenAI gives you access to powerful language models but with more control over your data. You also get pay-as-you-go pricing, which is more flexible compared to the flat fees of services like ChatGPT and Claude.

If privacy is a big deal for you, Azure OpenAI is a solid choice. They use your data responsibly and follow strict policies to prevent misuse. On the flip side, other services like ChatGPT or Claude might use your data to train future models or enhance the platform, which can be a concern if you're mindful of how your data is handled.

## Prerequisites

- An Azure account with access to Azure OpenAI service
- Azure OpenAI API key and endpoint

## Setting up Azure OpenAI Model
To use this application, you need to set up a model in Azure OpenAI portal. Follow these steps:

1. In the Azure OpenAI Studio, deploy a new model.
    * Follow the guide here: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource
1. After deployment, note down the following information:
    * API Key
    * Endpoint URL
    * Deployment name (e.g. gpt-4o)
1. Use these details to populate your `.env` file.

## Getting Started

1. Clone this repository and navigate to the project root:
   ```
   git clone https://github.com/andreassamoilov/AzChat.git && cd AzChat
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy `.env.example` and rename it to `.env` in the root directory of the project and replace the placeholders with your actual Azure OpenAI service credentials.

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000` to access the application.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
