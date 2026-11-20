import React, { useId } from 'react';

export default function PulseLogo({ className = "w-11 h-11", ...props }) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const navyId = `pulse-navy-${id}`;
  const mintId = `pulse-mint-${id}`;

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1024 1024" 
      role="img" 
      aria-labelledby={`title-${id} desc-${id}`}
      className={`shrink-0 ${className}`}
      {...props}
    >
      <title id={`title-${id}`}>Pulse Logo</title>
      <desc id={`desc-${id}`}>Nayaruvi Pulse icon - geometric symbol representing connected teamwork and completed work.</desc>

      <defs>
        <linearGradient id={navyId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#263449"/>
          <stop offset="1" stopColor="#172235"/>
        </linearGradient>
        <linearGradient id={mintId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E8F2ED"/>
          <stop offset="1" stopColor="#C8DAD2"/>
        </linearGradient>
      </defs>

      {/* Main continuous workspace loop */}
      <path 
        d="M278 204
           C278 154 318 114 368 114
           H608
           C782 114 902 232 902 394
           C902 512 838 601 738 650
           L620 708
           H442
           C388 708 344 664 344 610
           C344 556 388 512 442 512
           H606
           C678 512 728 462 728 396
           C728 330 678 280 606 280
           H448
           C354 280 278 356 278 450
           Z"
        fill={`url(#${navyId})`}
      />

      {/* Open collaboration space */}
      <path 
        d="M278 450
           C278 356 354 280 448 280
           H606
           C678 280 728 330 728 396
           C728 462 678 512 606 512
           H442
           C388 512 344 556 344 610
           C344 664 388 708 442 708
           H368
           C318 708 278 668 278 618
           Z"
        fill="#F8FBF9"
      />

      {/* Three connected teammates */}
      <g fill={`url(#${navyId})`}>
        <circle cx="500" cy="365" r="43"/>
        <circle cx="393" cy="394" r="34"/>
        <circle cx="607" cy="394" r="34"/>
        <path d="M423 477
                 C423 426 457 397 500 397
                 C543 397 577 426 577 477
                 V512 H423 Z"/>
        <path d="M336 488
                 C336 448 360 424 393 424
                 C412 424 428 433 439 448
                 C425 465 417 487 417 512
                 H336 Z"/>
        <path d="M663 488
                 C663 448 639 424 607 424
                 C588 424 572 433 561 448
                 C575 465 583 487 583 512
                 H663 Z"/>
      </g>

      {/* Task ribbon: mint card with check, crossing the loop */}
      <path 
        d="M180 570
           C180 526 216 490 260 490
           H510
           C546 490 575 519 575 555
           C575 591 546 620 510 620
           H315
           L250 685
           C226 709 185 692 185 658
           V620
           C182 605 180 588 180 570 Z"
        fill={`url(#${mintId})`}
      />

      {/* Checkmark seal */}
      <circle cx="287" cy="557" r="39" fill="#1D2A3E"/>
      <path 
        d="M268 557 L282 571 L308 541"
        fill="none" 
        stroke="#F7FBF8" 
        strokeWidth="11"
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* Minimal task lines */}
      <path 
        d="M355 544 H475 M355 579 H445"
        fill="none" 
        stroke="#AFC6BC" 
        strokeWidth="13"
        strokeLinecap="round"
      />
    </svg>
  );
}
