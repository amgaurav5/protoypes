// A small, inspectable few-shot corpus for Orbit's model-free intent planner.
// These are examples, not model training; they guide deterministic intent matching.
const groups = {
  create_task: [
    'Create a follow-up task for {company}', 'Remind me to call {company} tomorrow',
    'Add a task to check in with {company}', 'Create a task to send the proposal to {company}',
    'Add a follow-up for {company} next week', 'Make a task to prepare for the {company} meeting',
    'Remind the owner to contact {company}', 'Create a task to review the {company} opportunity',
    'Add a task to ask {company} for feedback', 'Schedule a follow-up task for {company}',
    'Create a reminder to call {company} on Friday', 'Add a task to share the contract with {company}',
    'Make a task to qualify the {company} lead', 'Create a task to check the deal status for {company}',
    'Add a task to prepare onboarding for {company}', 'Remind me to follow up with {company} after the demo',
    'Create a task for the next step with {company}', 'Add a CRM task to reach out to {company}',
    'Create a task to confirm the decision timeline with {company}', 'Make a follow-up reminder for {company}'
  ],
  update_deal: [
    'Move the {company} deal to {stage}', 'Update {company} opportunity stage to {stage}',
    'Set the {company} deal stage as {stage}', 'Advance {company} to {stage}',
    'Change the stage of the {company} deal to {stage}', 'Mark {company} as {stage}',
    'Move opportunity {company} into {stage}', 'Update the pipeline for {company} to {stage}',
    'Put the {company} deal in {stage}', 'Change {company} opportunity to {stage}',
    'Set {company} pipeline status to {stage}', 'Move the deal with {company} forward to {stage}',
    'Update deal stage for {company}: {stage}', 'Mark the {company} opportunity {stage}',
    'Please move {company} to the {stage} stage', 'Change {company} from its current stage to {stage}',
    'Advance the {company} opportunity into {stage}', 'Set deal {company} to {stage}',
    'Move {company} in the pipeline to {stage}', 'Update {company} deal to the {stage} stage'
  ],
  send_email: [
    'Send a welcome email to {contact}', 'Email {contact} about the next steps',
    'Send {contact} a follow-up email', 'Write and send an email to {contact}',
    'Send a proposal email to {contact}', 'Email {contact} to confirm our meeting',
    'Send a customer onboarding email to {contact}', 'Send an email to {contact} thanking them for the call',
    'Send {contact} an update about the deal', 'Email {contact} with the requested information',
    'Send a reminder email to {contact}', 'Send {contact} a meeting recap by email',
    'Email {contact} about the contract', 'Send a renewal email to {contact}',
    'Send {contact} an introduction email', 'Email {contact} to ask for feedback',
    'Send an email to {contact} with our pricing', 'Send a product demo follow-up to {contact}',
    'Send {contact} the customer welcome message', 'Send an email to {contact} about onboarding'
  ],
  create_calendar_event: [
    'Schedule a kickoff meeting with {contact}', 'Create a calendar event for a call with {contact}',
    'Book a meeting with {contact} next week', 'Schedule a demo for {company}',
    'Add a calendar event for the {company} review', 'Set up a kickoff with {company}',
    'Schedule a follow-up meeting with {contact}', 'Book time with {contact} tomorrow',
    'Create an event for the customer onboarding call', 'Put the {company} meeting on my calendar',
    'Schedule a discovery call with {contact}', 'Add a meeting with {company} to Google Calendar',
    'Set up a proposal review with {contact}', 'Create a calendar invite for {contact}',
    'Schedule a renewal discussion with {company}', 'Book a customer success kickoff for {company}',
    'Add a calendar event for a demo next Tuesday', 'Schedule a call to discuss the {company} deal',
    'Create a meeting invite for {contact} on Friday', 'Arrange a follow-up call with {company}'
  ],
  post_slack_message: [
    'Notify the team in Slack about {company}', 'Post a Slack update about the {company} deal',
    'Send a Slack message to the sales channel about the win', 'Tell customer success in Slack about {company}',
    'Post the deal update in Slack', 'Share the {company} handoff in Slack',
    'Send a Slack message announcing the new customer', 'Notify the team on Slack that {company} closed',
    'Post a Slack message with the meeting recap', 'Share the pipeline change in Slack',
    'Tell the sales team in Slack that the proposal was sent', 'Send a Slack update about onboarding {company}',
    'Post an internal Slack note about {company}', 'Notify the account team in Slack about the renewal',
    'Share the {company} opportunity status in Slack', 'Send a Slack message to customer success about kickoff',
    'Post in Slack that {company} needs a follow-up', 'Update the team in Slack about the customer call',
    'Send a Slack handoff message for {company}', 'Announce the {company} deal stage in Slack'
  ]
};

const companies = ['Acme', 'Northstar', 'Contoso', 'Globex'];
const contacts = ['the main contact', 'Jordan Lee', 'the customer', 'the deal owner'];
const stages = ['Discovery', 'Qualified', 'Proposal', 'Negotiation'];
const examples = Object.entries(groups).flatMap(([intent, prompts]) => prompts.map((text, index) => ({
  intent,
  prompt: text.replace('{company}', companies[index % companies.length]).replace('{contact}', contacts[index % contacts.length]).replace('{stage}', stages[index % stages.length])
})));

module.exports = { examples };
