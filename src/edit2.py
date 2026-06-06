# -*- coding: utf-8 -*-
import os

file_path = r'd:\Project\Skytree\Website\src\App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

target_start = 2321  # Line 2322
target_end = 2525    # Line 2526

if 'setPaymentStep(2)' in lines[target_start]:
    new_lines = lines[:target_start] + [
        '                  <button className="btn-primary w-full" style={{ marginTop: \'24px\' }} onClick={handleRazorpayPayment}>',
        '                    Continue to Payment',
        '                  </button>',
        '                </div>',
        '              )}',
        ''
    ] + lines[target_end+1:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines) + '\n')
    print('Safely updated lines 2322 to 2526')
else:
    print('Line 2322 did not match expected value. It was:', lines[target_start])
