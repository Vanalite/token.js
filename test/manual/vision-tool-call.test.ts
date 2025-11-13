import { describe, expect, it } from 'vitest'

import { TokenJS } from '../../src'

/**
 * This test specifically validates the fix for the Claude API error:
 * "messages.0.content.1.tool_result.tool_use_id: String should match pattern '^[a-zA-Z0-9_-]+$'"
 *
 * The error occurred when combining vision (images) and tool calls because tool_call_ids
 * from OpenAI format can contain characters not allowed by Anthropic's strict pattern.
 *
 * The fix sanitizes tool_call_ids to only contain alphanumeric, underscore, and hyphen characters.
 */
describe('Vision with Tool Calls - Claude Provider', () => {
  it('successfully handles image analysis with tool calls', async () => {
    const tokenjs = new TokenJS()

    // Define a simple tool for getting image metadata
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'get_image_metadata',
          description: 'Get metadata about an analyzed image',
          parameters: {
            type: 'object',
            properties: {
              animal_type: {
                type: 'string',
                description: 'The type of animal detected in the image',
              },
              confidence: {
                type: 'string',
                description: 'Confidence level (high, medium, low)',
              },
            },
            required: ['animal_type', 'confidence'],
          },
        },
      },
    ]

    // Step 1: Send image with tool definition
    const response1 = await tokenjs.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and tell me what animal you see. Use the get_image_metadata tool to provide structured information.',
            },
            {
              type: 'image_url',
              image_url: {
                // Image of a cat
                url: 'https://media.4-paws.org/b/8/8/0/b8805ed707116deaaefe35c6745da0f45615334d/VIER%20PFOTEN_2019-12-13_209-2890x2000-1920x1329.webp',
              },
            },
          ],
        },
      ],
      tools,
      tool_choice: 'auto',
    })

    console.log('Response 1:', JSON.stringify(response1, null, 2))

    // Verify the model called the tool
    expect(response1.choices[0].message.tool_calls).toBeDefined()
    expect(response1.choices[0].message.tool_calls?.length).toBeGreaterThan(0)
    expect(response1.choices[0].finish_reason).toBe('tool_calls')

    const toolCall = response1.choices[0].message.tool_calls![0]
    expect(toolCall.function.name).toBe('get_image_metadata')

    // Parse the tool call arguments
    const args = JSON.parse(toolCall.function.arguments)
    console.log('Tool call arguments:', args)

    // Step 2: Provide tool result - this is where the bug would occur
    // The tool_call_id may contain special characters that need sanitization
    const response2 = await tokenjs.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and tell me what animal you see. Use the get_image_metadata tool to provide structured information.',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'https://media.4-paws.org/b/8/8/0/b8805ed707116deaaefe35c6745da0f45615334d/VIER%20PFOTEN_2019-12-13_209-2890x2000-1920x1329.webp',
              },
            },
          ],
        },
        response1.choices[0].message,
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            animal_type: args.animal_type || 'cat',
            confidence: args.confidence || 'high',
            additional_info: 'Image successfully analyzed',
          }),
        },
      ],
      tools,
    })

    console.log('Response 2:', JSON.stringify(response2, null, 2))

    // Verify the final response
    expect(response2.choices[0].finish_reason).toBe('stop')
    expect(response2.choices[0].message.content).toBeDefined()
    expect(response2.choices[0].message.content?.toLowerCase()).toContain('cat')

    console.log('✅ Successfully completed vision + tool call flow with Claude')
  })

  it('handles multiple tool calls with images', async () => {
    const tokenjs = new TokenJS()

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'analyze_image_colors',
          description: 'Analyze the dominant colors in an image',
          parameters: {
            type: 'object',
            properties: {
              dominant_colors: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of dominant colors',
              },
            },
            required: ['dominant_colors'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'detect_objects',
          description: 'Detect objects in an image',
          parameters: {
            type: 'object',
            properties: {
              objects: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of detected objects',
              },
            },
            required: ['objects'],
          },
        },
      },
    ]

    const response = await tokenjs.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image using both the color analysis and object detection tools.',
            },
            {
              type: 'image_url',
              image_url: {
                url: 'https://media.4-paws.org/b/8/8/0/b8805ed707116deaaefe35c6745da0f45615334d/VIER%20PFOTEN_2019-12-13_209-2890x2000-1920x1329.webp',
              },
            },
          ],
        },
      ],
      tools,
      tool_choice: 'auto',
    })

    console.log(
      'Multiple tool calls response:',
      JSON.stringify(response, null, 2)
    )

    // The model might call one or both tools
    if (response.choices[0].message.tool_calls) {
      expect(response.choices[0].message.tool_calls.length).toBeGreaterThan(0)
      console.log(
        `✅ Successfully handled ${response.choices[0].message.tool_calls.length} tool call(s) with vision`
      )
    }
  })
})
