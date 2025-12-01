-- Add payment_stages and terms_conditions columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS payment_stages JSONB DEFAULT '[
  {"id": "1", "stage": "1", "milestone": "Design Phase", "percentage": 10},
  {"id": "2", "stage": "2", "milestone": "Material Procurement", "percentage": 30},
  {"id": "3", "stage": "3", "milestone": "Execution Start", "percentage": 30},
  {"id": "4", "stage": "4", "milestone": "Mid-Execution", "percentage": 20},
  {"id": "5", "stage": "5", "milestone": "Final Handover", "percentage": 10}
]'::jsonb,
ADD COLUMN IF NOT EXISTS terms_conditions JSONB DEFAULT '[
  {
    "id": "1",
    "title": "PROJECT DURATION FOR 30 DAYS (AFTER DESIGN PHASE)",
    "content": "The execution phase will commence post-design approval and is estimated to be completed within 30 working days, subject to site readiness and material availability."
  },
  {
    "id": "2",
    "title": "MATERIAL DISPATCH & EXECUTION PROCESS",
    "content": "Materials will be dispatched as per the approved design and timeline. Installation will be carried out by trained professionals ensuring quality standards."
  },
  {
    "id": "3",
    "title": "SITE READINESS",
    "content": "The client must ensure that the site is ready with completed civil work, electrical points, plumbing, and false ceiling before execution begins. Any delays due to site unreadiness will extend the project timeline."
  },
  {
    "id": "4",
    "title": "IMPLICATIONS OF PAYMENT DELAY",
    "content": "Delayed payments may result in project timeline extensions and additional charges. Timely payments ensure smooth project execution and delivery."
  },
  {
    "id": "5",
    "title": "DESIGN PHASE TIMELINES & DELAY POLICY",
    "content": "Design approval is expected within 7-10 working days. Delays in design approval will proportionally delay the overall project timeline."
  },
  {
    "id": "6",
    "title": "CHANGES DURING EXECUTION DUE TO TECHNICAL LIMITATION",
    "content": "Any on-site technical constraints may require minor design modifications. Such changes will be communicated and executed with client consent."
  },
  {
    "id": "7",
    "title": "SERVICE WARRANTY & TRANSPARENCY",
    "content": "We provide a warranty on manufacturing defects and workmanship. All materials used will be as per approved specifications with complete transparency."
  }
]'::jsonb;