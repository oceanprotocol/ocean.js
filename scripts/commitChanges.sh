# Check if the CodeExamples.md file has been changed
original=$(md5sum CodeExamples.md)
echo $original
npm run create:guide
new=$(md5sum CodeExamples.md)
echo $new

# Check if file has changed
if [ "$new" = "$original" ]; then
    echo "CodeExamples.md file has not been changed"
else
    echo "CodeExamples.md file has been changed. Committing changes"
    # Stage the file, commit and push
    git status
    git add CodeExamples.md
    git commit -m "Updating CodeExamples.md"
    branch=${GITHUB_HEAD_REF#refs/heads/}
    echo Pushing changes to branch: ${branch}
    git push origin HEAD:${branch} --force
fi

# Check if the C2DExamples.md file has been changed
original=$(md5sum C2DExamples.md)
echo $original
npm run create:guidec2d
new=$(md5sum C2DExamples.md)
echo $new

# Check if file has changed
if [ "$new" = "$original" ]; then
    echo "C2DExamples.md file has not been changed"
else
    echo "C2DExamples.md file has been changed. Committing changes"
    # Stage the file, commit and push
    git status
    git add C2DExamples.md
    git commit -m "Updating C2DExamples.md"
    branch=${GITHUB_HEAD_REF#refs/heads/}
    echo Pushing changes to branch: ${branch}
    git push origin HEAD:${branch} --force
fi