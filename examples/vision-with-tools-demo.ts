/**
 * Demo: Using Vision + Tool Calls with Claude
 *
 * This demonstrates the fix for the Claude API error when combining images and tool calls.
 * Before the fix, tool_call_ids with special characters would cause:
 * "messages.0.content.1.tool_result.tool_use_id: String should match pattern '^[a-zA-Z0-9_-]+$'"
 *
 * After the fix, all tool_call_ids are automatically sanitized to match Anthropic's requirements.
 */

import { TokenJS } from '../src'

async function demonstrateVisionWithTools() {
  const tokenjs = new TokenJS()

  console.log('🚀 Starting Vision + Tool Calls Demo with Claude\n')

  // Define a tool for analyzing images
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'save_image_analysis',
        description:
          'Save the results of an image analysis to a database or file',
        parameters: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'The main subject detected in the image',
            },
            description: {
              type: 'string',
              description: 'A brief description of what was found',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Relevant tags for the image',
            },
          },
          required: ['subject', 'description'],
        },
      },
    },
  ]

  console.log('📸 Step 1: Sending image to Claude with tool definition...')

  try {
    // Step 1: Send image with tool
    const response1 = await tokenjs.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this image and use the save_image_analysis tool to record your findings.',
            },
            {
              type: 'image_url',
              image_url: {
                // Example: Image of a cat
                url: 'https://media.4-paws.org/b/8/8/0/b8805ed707116deaaefe35c6745da0f45615334d/VIER%20PFOTEN_2019-12-13_209-2890x2000-1920x1329.webp',
              },
            },
          ],
        },
      ],
      tools,
      tool_choice: 'auto',
    })

    console.log('\n✅ Response 1 received!')
    console.log(
      `   Finish reason: ${response1.choices[0].finish_reason}`
    )

    if (response1.choices[0].message.tool_calls) {
      const toolCall = response1.choices[0].message.tool_calls[0]
      console.log(`   Tool called: ${toolCall.function.name}`)
      console.log(`   Tool call ID: ${toolCall.id}`)
      console.log(
        `   Arguments: ${JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2)}`
      )

      console.log(
        '\n🔧 Step 2: Sending tool result back to Claude...'
      )
      console.log(
        `   (This is where the bug would occur with unsanitized tool_call_ids)`
      )

      // Step 2: Send tool result - THIS IS WHERE THE FIX APPLIES
      const response2 = await tokenjs.chat.completions.create({
        provider: 'anthropic',
        model: 'claude-sonnet-4-5',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this image and use the save_image_analysis tool to record your findings.',
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
              status: 'success',
              saved_at: new Date().toISOString(),
              message: 'Analysis saved successfully',
            }),
          },
        ],
        tools,
      })

      console.log('\n✅ Response 2 received!')
      console.log(
        `   Finish reason: ${response2.choices[0].finish_reason}`
      )
      console.log(
        `   Final response: ${response2.choices[0].message.content}`
      )

      console.log(
        '\n🎉 SUCCESS! Vision + Tool Calls working perfectly with Claude!'
      )
      console.log(
        '   The tool_call_id was automatically sanitized to match Anthropic\'s requirements.'
      )
    } else {
      console.log(
        '\n⚠️  No tool calls were made (model chose not to use the tool)'
      )
    }
  } catch (error: any) {
    console.error('\n❌ Error occurred:')
    console.error(error.message || error)

    if (error.message?.includes('ANTHROPIC_API_KEY')) {
      console.log(
        '\n💡 Tip: Set your ANTHROPIC_API_KEY environment variable to run this demo:'
      )
      console.log('   export ANTHROPIC_API_KEY="your-key-here"')
    }
  }
}

// Run the demo
if (require.main === module) {
  demonstrateVisionWithTools().catch(console.error)
}

export { demonstrateVisionWithTools }
