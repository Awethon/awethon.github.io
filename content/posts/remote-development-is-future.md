---
title: "Remote development is a future of big tech"
date: 2022-02-23T09:00:00+03:00
draft: false
tags: ["Remote Development", "Big Tech", "Intellij IDEA", "VSCode"]
---
The remote development feature allows you to use IDE or code editor on a remote machine. 
All that local machine needs is a client that draws interface, sends, and receives data, like a browser.

VSCode was the first to introduce this feature.
Things are much easier for VSCode since it's a code editor built on electron, while for example, IntelliJ IDEA is an IDE and uses Java Swing library for UI.  
In Autumn 2022, JetBrains also caught this trend and announced a remote development feature for its products and a completely new IDE built up from scratch that also supports this feature.

Remote development is a fast-growing trend right now, and there are reasons for it.
I've tested it for IntelliJ IDEA and was inspired by the number of advantages remote development gives. Even though this feature is still in beta and bugs appear from time to time, it's totally worth it to try.

Let's now look at all the advantages remote developing gives to software developers and companies.


## No need for powerful laptops anymore

No need to upgrade the laptops of employees every 2-3 years. Cheaper alternatives could be bought i.e. Macbook Air instead of Macbook Pro. Even Raspberry Pi could be used!   
Not only does it reduce the cost of equipment but also allows choosing battery capacity over CPU performance.

## Longer battery life for a laptop

Using IDE or code editor with remote development feature is like using a browser in terms of resources consumption.
There's nothing but front-end, all the computations are made on a remote machine.
This also means that the laptop won't get hot and loud because of compilation or running tests.

## The same environment for every developer

Did you encounter a problem where you have code pointing at the same commit, but it only works for you and not your colleague?  
Not going to lie: for most of the time, the platform-specific behavior of testcontainers library was the reason.
Still, it's a very unpleasant and hard-to-debug problem.

With remote development, this problem is solved by keeping the same environment on virtual machines.

## Cross-platform solution

Developers won't be limited in choosing preferable devices anymore.  
Software development using iPad with a keyboard? Not a problem anymore!  
PC on Windows at home is able to become a work tool in just a few minutes.

## Reduction of costs by using cloud infrastructure

Big tech companies are able to use the advantages of cloud infrastructure.  
Since they have developers distributed around the globe, it means that remote machines' resources usage is distributed in time, so not so many resources simultaneously.  
If there's a need to have more CPU/RAM, then virtual machines can easily be scaled in a cloud.

## Code is not stored on disk locally

The risk of code leakage is reduced, and it might be an important advantage for a company.

## Locality of data

Big tech companies might have their own docker registry or artifact repository like Artifactory.
Having your virtual machine in the same data center would mean almost instant download and upload of libraries and docker images.

## Faster onboarding

Since everything is stored on a virtual machine, the environment can be prepared in advance to reduce onboarding time significantly.

---

I'm really satisfied with where the new era of IDEs is going.  
The only disadvantage I see is an inability to work without the Internet which is not important to me.  
Hope that you'll like remote development too!

---
### Links:  
[VSCode Remote Development](https://code.visualstudio.com/docs/remote/remote-overview/)  
[Remote Development for JetBrains products](https://www.jetbrains.com/remote-development/)  
[JetBrains Remote Development announcement post](https://blog.jetbrains.com/blog/2021/11/29/introducing-remote-development-for-jetbrains-ides/)  
