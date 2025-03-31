---
title: "My Attempt to Migrate to Mill"
date: 2025-03-31T03:10:43+02:00
draft: false
---

In the year of 2025 I have attended Scalar Conference in Warsaw that had Li Haoyi as one of the speakers. 
He was talking about Mill and how it is better than SBT. 
I have decided to give it a try and migrate one of my projects to Mill. 

Unfortunately, I have failed. Mill is marketed as a replacement for any other build tool but it is not the case at least for Scala 2.13.
Below I will state the reasons why Mill is not a drop-in replacement for SBT for my case.

# IDE Support
In Mill docs there's a page [Case Study: Mill vs SBT](https://mill-build.org/mill/comparisons/sbt.html). 

A quote from the page:
> One area that Mill does significantly better than SBT is in the IDE support.

Another quote:
> In general, although your IDE can make sure the name of the task exists, and the type is correct, it is unable to pull up any further information about the task: its documentation, its implementation, usages, any upstream overridden implementations, etc.

This is literally not the case. Actually, it is the opposite.

By just enabling one checkbox in IntelliJ IDEA, I have access to the sources of sbt:
![Image](/sbt-sources.png)

And to the sources of the plugin from a library I use:
![Image](/sbt-plugin-sources.png)

I haven't managed to make IDEA to pick up the sources of Mill, even after following the instructions from the official docs:
![Image](/mill-sources.png)

According to [the docs](https://mill-build.org/mill/cli/installation-ide.html) it's only possible to use Mill in IntelliJ IDEA in BSP mode. 
I have tried to migrate my SBT project to Mill and use BSP mode in IDEA but Mill sources were not picked up.

# The performance of Mill in comparison to SBT
I think the gains that Mill gives are highly exaggerated. 
I have tried to build (clean compile) one of my projects with 16 modules with Mill and SBT. 
And it was 8 seconds vs 9 seconds on M4 Max. Definitely not worth the effort.

# No better-monadic-for plugin support for Mill
While this plugin is not needed for Scala 3, it is still needed for Scala 2.13. 
And Mill not having it means it can't be an easy replacement for SBT for Scala 2.13 projects.

# Mill's BuildInfo plugin is not a 1:1 replacement for sbt-buildinfo
Besides the basic functionality of generating a file with build information, sbt-buildinfo has a lot of features that Mill's BuildInfo plugin doesn't have.
These are the options that are used in our projects and none of them are present in Mill's BuildInfo plugin:
{{< highlight scala >}}
BuildInfoOption.ToJson,
BuildInfoOption.BuildTime,
BuildInfoOption.Traits("com.chilipiper.common.BuildInfoT"),
BuildInfoOption.PackagePrivate,
{{< /highlight >}}

Having a trait for BuildInfo is important for us as we have internal libraries that accept it as a parameter.

# Conclusion
Besides the fact that Mill is easier to understand and write than SBT, it is not a drop-in replacement for SBT for Scala 2.13 projects.
And even for Scala 3 projects, the benefits of using Mill are not that great to justify the migration effort.
What I have not tested though is the parallel test execution of Mill vs SBT, where Mill can easily be better than SBT.
Also, it's worth to mention how great `./mill init` migration tool is. I was able to quickly migrate most of my SBT project to Mill to test it out.

