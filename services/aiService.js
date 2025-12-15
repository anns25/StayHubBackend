import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'openai';
    
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    if (this.provider === 'gemini' && process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async generateText(prompt, maxTokens = 200) {
    try {
      if (this.provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: 0.7,
        });
        return response.choices[0].message.content.trim();
      }
      
      if (this.provider === 'gemini' && this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
      }
      
      throw new Error('No AI provider configured');
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateMultiple(prompts, maxTokens = 200) {
    const results = await Promise.all(
      prompts.map(prompt => this.generateText(prompt, maxTokens))
    );
    return results;
  }
}

export default new AIService();

